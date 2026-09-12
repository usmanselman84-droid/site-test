#!/usr/bin/env python3
"""Measure the admin mobile bar and its children to explain its height."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE, PASS, login

JS = r"""
() => {
  const bar = document.querySelector('.admin-mobile-bar');
  if (!bar) return null;
  const info = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0, 2).join('.'),
      h: Math.round(r.height), w: Math.round(r.width), display: cs.display,
      align: cs.alignItems, alignSelf: cs.alignSelf, gridRow: cs.gridRow, minH: cs.minHeight,
      pad: cs.padding, text: (el.innerText || '').trim().slice(0, 24),
    };
  };
  const parent = bar.parentElement;
  const pcs = getComputedStyle(parent);
  return {
    bar: info(bar),
    children: Array.from(bar.children).map(info),
    deep: Array.from(bar.querySelectorAll('*')).map(info).filter(x => x.h > 60),
    parent: { sel: parent.className.toString().slice(0, 40), display: pcs.display,
              gridTemplateRows: pcs.gridTemplateRows, gridTemplateAreas: pcs.gridTemplateAreas,
              alignItems: pcs.alignItems, h: Math.round(parent.getBoundingClientRect().height) },
  };
}
"""

s, session = login("qa-admin@sochi.ru", PASS)
assert (session.get("user") or {}).get("id")

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    ctx.add_cookies([{"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
                      "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies])
    page = ctx.new_page()
    page.goto(f"{BASE}/admin/bookings", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    data = page.evaluate(JS)
    print("BAR   ", data["bar"])
    print("PARENT", data["parent"])
    for c in data["children"]:
        print("  child", c)
    for d in data["deep"]:
        print("  tall ", d)
    browser.close()
