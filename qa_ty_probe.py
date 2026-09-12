#!/usr/bin/env python3
"""Targeted DOM probes: toaster overlay, broken images, admin top spacing."""
from __future__ import annotations

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

TOASTER_JS = """() => {
  const t = document.querySelector('.yp-toaster');
  if (!t) return null;
  const cs = getComputedStyle(t);
  const r = t.getBoundingClientRect();
  return { position: cs.position, pointerEvents: cs.pointerEvents, zIndex: cs.zIndex,
           w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top),
           children: t.children.length,
           hitTop: (document.elementFromPoint(195, 120) || {}).className?.toString().slice(0, 60),
           hitMid: (document.elementFromPoint(195, 400) || {}).className?.toString().slice(0, 60) };
}"""

IMG_JS = """() => Array.from(document.querySelectorAll('img')).map(i => ({
  src: (i.currentSrc || i.src || '').slice(-70),
  nw: i.naturalWidth, nh: i.naturalHeight,
  w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height),
  cls: (i.className || '').toString().slice(0, 30),
})).filter(i => i.h > 40)"""

TOP_JS = """() => {
  const out = [];
  for (const el of document.querySelectorAll('body > *, main > *, main > * > *')) {
    const r = el.getBoundingClientRect();
    if (r.height < 20) continue;
    const cs = getComputedStyle(el);
    out.push({ sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0,2).join('.'),
               top: Math.round(r.top), h: Math.round(r.height), pos: cs.position,
               mt: cs.marginTop, pt: cs.paddingTop, text: (el.innerText || '').trim().slice(0, 30) });
  }
  return out.slice(0, 14);
}"""

s, session = login("qa-admin@sochi.ru", PASS)
assert (session.get("user") or {}).get("id")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(f"({CONSENT_JS})();")
    ctx.add_cookies([{"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
                      "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies])
    page = ctx.new_page()

    page.goto(f"{BASE}/admin/bookings", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    print("toaster @/admin/bookings:", page.evaluate(TOASTER_JS))
    print("top layout @/admin/bookings:")
    for row in page.evaluate(TOP_JS):
        print("   ", row)

    page.goto(f"{BASE}/clubs", wait_until="load", timeout=45000)
    page.wait_for_timeout(3000)
    print("\nimages @/clubs:")
    for i in page.evaluate(IMG_JS):
        broken = "BROKEN" if not i["nw"] else ""
        print(f"   {i['w']}x{i['h']} nat={i['nw']}x{i['nh']} {broken} {i['cls']} {i['src']}")
    browser.close()
