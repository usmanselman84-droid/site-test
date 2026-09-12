#!/usr/bin/env python3
"""Report tall empty blocks and their DOM identity on given ty pages."""
from __future__ import annotations

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

FIND_JS = r"""
() => {
  const path = (el) => {
    const parts = [];
    let n = el;
    for (let i = 0; n && i < 4; i++, n = n.parentElement) {
      const cls = (n.className || '').toString().trim().split(/\s+/).slice(0, 3).join('.');
      parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return parts.join(' > ');
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.height < 100) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const text = (el.innerText || '').trim();
    const hasMedia = el.querySelector('img, svg, video, canvas, input, textarea, iframe');
    if (!text && !hasMedia && cs.backgroundImage === 'none') {
      out.push({ h: Math.round(r.height), top: Math.round(r.top + window.scrollY), sel: path(el) });
    }
  }
  // keep outermost only
  return out.filter((a, i) => !out.some((b, j) => j !== i && b.h >= a.h && Math.abs(b.top - a.top) < 8 && j < i)).slice(0, 12);
}
"""

paths = sys.argv[1:] or ["/admin/bookings"]
s, session = login("qa-admin@sochi.ru", PASS)
assert (session.get("user") or {}).get("id")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"({CONSENT_JS})();")
    ctx.add_cookies([{"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
                      "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies])
    page = ctx.new_page()
    for p in paths:
        page.goto(f"{BASE}{p}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2500)
        found = page.evaluate(FIND_JS)
        print(f"=== {p} ===")
        for f in found:
            print(f"   h={f['h']:4d} top={f['top']:5d}  {f['sel']}")
    browser.close()
