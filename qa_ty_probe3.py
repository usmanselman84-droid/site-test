#!/usr/bin/env python3
"""Probe navbar geometry vs main padding, and the profile name wrap element."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE, PASS, login

CONSENT_JS = """() => { try { localStorage.setItem('yp_cookie_consent_v3', JSON.stringify({necessary:true,analytics:true,preferences:true,at:new Date().toISOString(),version:'2026-09-07-portal'})); } catch (e) {} }"""

NAV_JS = r"""
() => {
  const nav = document.querySelector('header.glass-nav, .glass-nav');
  const main = document.querySelector('main.main-content');
  const g = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { sel: el.tagName.toLowerCase() + '.' + (el.className||'').toString().split(' ')[0],
             position: cs.position, top: Math.round(r.top), h: Math.round(r.height),
             pt: cs.paddingTop, mt: cs.marginTop, zIndex: cs.zIndex };
  };
  return { nav: g(nav), main: g(main), firstMainChild: g(main && main.firstElementChild) };
}
"""

NAME_JS = r"""
() => {
  const cands = Array.from(document.querySelectorAll('h1,h2,h3,strong,.profile-name,[class*=name]'))
    .filter(e => (e.innerText || '').includes('QA'))
    .slice(0, 6);
  return cands.map(e => {
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return { sel: e.tagName.toLowerCase() + '.' + (e.className||'').toString().split(' ').slice(0,3).join('.'),
             text: e.innerText.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height),
             wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap, fontSize: cs.fontSize,
             lines: Math.round(r.height / parseFloat(cs.lineHeight || '20')) };
  });
}
"""

s, session = login("user@sochi.ru", PASS)
assert (session.get("user") or {}).get("id")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"({CONSENT_JS})();")
    ctx.add_cookies([{"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
                      "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies])
    page = ctx.new_page()
    for path in ("/dashboard", "/dashboard/me", "/"):
        page.goto(f"{BASE}{path}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2200)
        print(f"=== {path} ===")
        print("  ", page.evaluate(NAV_JS))
        if path == "/dashboard/me":
            for n in page.evaluate(NAME_JS):
                print("   name:", n)
    browser.close()
