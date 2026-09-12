#!/usr/bin/env python3
"""Probe cabinet visual defects: top band, trailing space, messages placeholder, name wrap."""
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

BAND_JS = r"""
() => {
  const at = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { sel: el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ').slice(0, 3).join('.'),
             h: Math.round(r.height), top: Math.round(r.top), pt: cs.paddingTop, mt: cs.marginTop,
             bg: cs.backgroundColor };
  };
  return { y100: at(195, 100), y150: at(195, 150), y180: at(195, 180),
           docH: document.documentElement.scrollHeight, vh: window.innerHeight };
}
"""

TAIL_JS = r"""
() => {
  // find the lowest element with visible text, compare with document height
  let maxBottom = 0, sel = '';
  for (const el of document.querySelectorAll('main *')) {
    const t = (el.innerText || '').trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    const b = r.bottom + window.scrollY;
    if (b > maxBottom) { maxBottom = b; sel = el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]; }
  }
  return { lastTextBottom: Math.round(maxBottom), lastSel: sel, docH: document.documentElement.scrollHeight,
           trailing: Math.round(document.documentElement.scrollHeight - maxBottom) };
}
"""

MSG_JS = r"""
() => {
  const ph = Array.from(document.querySelectorAll('*')).find(e => (e.textContent || '').trim() === 'Выберите диалог');
  if (!ph) return { found: false };
  const host = ph.closest('div');
  const r = host.getBoundingClientRect();
  return { found: true, h: Math.round(r.height), top: Math.round(r.top + window.scrollY),
           sel: host.className.toString().slice(0, 60),
           parentSel: (host.parentElement.className || '').toString().slice(0, 60) };
}
"""

NAME_JS = r"""
() => {
  const h = document.querySelector('.profile-view h1, .profile-hero h1, h1');
  if (!h) return null;
  const cs = getComputedStyle(h);
  const r = h.getBoundingClientRect();
  return { text: h.innerText.trim().slice(0, 40), wordBreak: cs.wordBreak, overflowWrap: cs.overflowWrap,
           hyphens: cs.hyphens, w: Math.round(r.width), h: Math.round(r.height),
           fontSize: cs.fontSize, sel: h.className.toString().slice(0, 50) };
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

    page.goto(f"{BASE}/dashboard", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    print("dashboard band:", page.evaluate(BAND_JS))
    print("dashboard tail:", page.evaluate(TAIL_JS))

    page.goto(f"{BASE}/dashboard/messages", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    print("messages placeholder:", page.evaluate(MSG_JS))
    print("messages tail:", page.evaluate(TAIL_JS))

    page.goto(f"{BASE}/dashboard/me", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    print("profile name:", page.evaluate(NAME_JS))
    print("profile band:", page.evaluate(BAND_JS))
    browser.close()
