#!/usr/bin/env python3
"""Browser QA on ty: console errors, timings, and layout hygiene per page.

Usage: python3 qa_ty_browser.py [mobile|desktop] [role]
Roles: guest, user, admin
"""
from __future__ import annotations

import json
import os
import sys

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE, PASS, login

CONSENT_JS = """() => {
  try {
    localStorage.setItem('yp_cookie_consent_v3', JSON.stringify({
      necessary: true, analytics: true, preferences: true,
      at: new Date().toISOString(), version: '2026-09-07-portal',
    }));
  } catch (e) {}
}"""

MOBILE = {"viewport": {"width": 390, "height": 844}, "device_scale_factor": 2, "is_mobile": True, "has_touch": True,
          "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"}
DESKTOP = {"viewport": {"width": 1440, "height": 900}}

GUEST_PAGES = ["/", "/events", "/news", "/projects", "/clubs", "/spaces", "/coworking", "/gallery",
               "/vacancies", "/places", "/documents", "/faq", "/contacts", "/search", "/login", "/register"]
USER_PAGES = ["/dashboard", "/dashboard/me", "/dashboard/messages", "/dashboard/friends", "/dashboard/shop",
              "/dashboard/achievements", "/dashboard/settings", "/dashboard/notifications", "/dashboard/games",
              "/dashboard/applications", "/dashboard/portfolio", "/dashboard/tickets", "/dashboard/edit"]
ADMIN_PAGES = ["/admin", "/admin/users", "/admin/bookings", "/admin/moderation", "/admin/settings", "/admin/stats",
               "/admin/spaces", "/admin/news", "/admin/audit-log", "/admin/occupancy", "/admin/system"]

AUDIT_JS = r"""
() => {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: [], overlaps: [], gaps: [], tinyTap: [], emptyBlocks: 0, hasHeader: false, hasBottomNav: false, dupHeaders: 0 };
  out.hasHeader = !!document.querySelector('header.glass-nav, .glass-nav');
  out.dupHeaders = document.querySelectorAll('header.glass-nav, .glass-nav').length;
  out.hasBottomNav = !!document.querySelector('nav.yp-bottom-nav');
  out.scrollW = document.documentElement.scrollWidth;
  out.clientW = vw;
  const els = Array.from(document.querySelectorAll('body *'));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') continue;
    if (r.right > vw + 2 || r.left < -2) {
      if (cs.overflowX === 'visible' && el.children.length < 40) {
        out.overflow.push({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0, 2).join('.'), left: Math.round(r.left), right: Math.round(r.right) });
      }
    }
    // interactive elements smaller than 40px
    if ((el.tagName === 'A' || el.tagName === 'BUTTON') && (r.height < 32 || r.width < 32) && el.innerText.trim()) {
      out.tinyTap.push({ text: el.innerText.trim().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) });
    }
    // visually empty containers taking vertical space
    if (r.height > 120 && el.children.length === 0 && !el.innerText.trim() && el.tagName !== 'IMG' && el.tagName !== 'SVG'
        && cs.backgroundImage === 'none') {
      out.emptyBlocks += 1;
    }
  }
  // large vertical gaps between consecutive sections
  const secs = Array.from(document.querySelectorAll('main > *, main section, .dashboard-page > *')).filter(e => e.getBoundingClientRect().height > 0);
  for (let i = 1; i < secs.length; i++) {
    const a = secs[i - 1].getBoundingClientRect(), b = secs[i].getBoundingClientRect();
    const gap = Math.round(b.top - a.bottom);
    if (gap > 96) out.gaps.push({ gap, after: secs[i - 1].className.toString().slice(0, 40) });
  }
  out.overflow = out.overflow.slice(0, 6);
  out.tinyTap = out.tinyTap.slice(0, 6);
  out.gaps = out.gaps.slice(0, 6);
  out.textLen = (document.body.innerText || '').trim().length;
  return out;
}
"""


def run(mode: str, role: str) -> None:
    ctx_opts = MOBILE if mode == "mobile" else DESKTOP
    storage_cookies = []
    if role != "guest":
        email = "qa-admin@sochi.ru" if role == "admin" else "user@sochi.ru"
        s, session = login(email, PASS)
        if not (session.get("user") or {}).get("id"):
            print(f"!! login failed for {role}")
            return
        for c in s.cookies:
            storage_cookies.append({"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru",
                                    "path": c.path or "/", "httpOnly": True, "secure": True, "sameSite": "Lax"})
    pages = GUEST_PAGES if role == "guest" else (USER_PAGES if role == "user" else USER_PAGES + ADMIN_PAGES)

    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(**ctx_opts)
        if storage_cookies:
            ctx.add_cookies(storage_cookies)
        ctx.add_init_script(f"({CONSENT_JS})();")
        page = ctx.new_page()
        errors: list[str] = []
        page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:160]}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {str(e)[:160]}"))
        for path in pages:
            errors.clear()
            try:
                page.goto(f"{BASE}{path}", wait_until="domcontentloaded", timeout=45000)
                page.wait_for_timeout(2200)
                nav = page.evaluate("() => { const t = performance.getEntriesByType('navigation')[0] || {}; const p = performance.getEntriesByType('paint'); return { load: Math.round(t.loadEventEnd || 0), dcl: Math.round(t.domContentLoadedEventEnd || 0), fcp: Math.round((p.find(x=>x.name==='first-contentful-paint')||{}).startTime || 0) }; }")
                audit = page.evaluate(AUDIT_JS)
            except Exception as exc:  # noqa: BLE001
                print(f"{path:32s} EXC {str(exc)[:120]}")
                continue
            errs = [e for e in errors if "error" in e or "pageerror" in e]
            results.append({"path": path, "nav": nav, "audit": audit, "errors": errs[:5]})
            flags = []
            if audit["scrollW"] > audit["clientW"] + 2:
                flags.append(f"H-SCROLL({audit['scrollW']}>{audit['clientW']})")
            if audit["dupHeaders"] > 1:
                flags.append(f"DUP_HEADER({audit['dupHeaders']})")
            if not audit["hasHeader"]:
                flags.append("NO_HEADER")
            if audit["emptyBlocks"]:
                flags.append(f"EMPTY_BLOCKS({audit['emptyBlocks']})")
            if audit["gaps"]:
                flags.append(f"BIG_GAPS({len(audit['gaps'])}:{audit['gaps'][0]['gap']}px)")
            if audit["overflow"]:
                flags.append(f"OVERFLOW({len(audit['overflow'])})")
            if audit["tinyTap"]:
                flags.append(f"TINY_TAP({len(audit['tinyTap'])})")
            if audit["textLen"] < 400:
                flags.append(f"THIN_TEXT({audit['textLen']})")
            if errs:
                flags.append(f"JS_ERR({len(errs)})")
            print(f"{path:32s} fcp={nav['fcp']:5d} load={nav['load']:5d} {' '.join(flags)}")
        browser.close()

    out = f"/tmp/qa_{mode}_{role}.json"
    with open(out, "w") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=1)
    print("saved", out)


if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "mobile", sys.argv[2] if len(sys.argv) > 2 else "guest")
