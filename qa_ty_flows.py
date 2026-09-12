#!/usr/bin/env python3
"""Interactive mobile flows on ty: open a chat thread, open mobile menu, admin nav."""
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


def ctx_for(pw, email: str):
    s, session = login(email, PASS)
    assert (session.get("user") or {}).get("id"), f"login failed: {session}"
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                              has_touch=True)
    ctx.add_init_script(f"({CONSENT_JS})();")
    ctx.add_cookies([
        {"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
         "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies
    ])
    return browser, ctx


with sync_playwright() as pw:
    browser, ctx = ctx_for(pw, "user@sochi.ru")
    page = ctx.new_page()
    errs: list[str] = []
    page.on("pageerror", lambda e: errs.append(str(e)[:100]))

    print("=== chat thread open ===")
    page.goto(f"{BASE}/dashboard/messages", wait_until="load", timeout=45000)
    page.wait_for_timeout(2500)
    rows = page.locator(".yp-chat-row, .chat-list__item, [data-conversation-id], li.messages-list__item")
    print("candidate rows:", rows.count())
    if rows.count() == 0:
        rows = page.get_by_text("QA Участник")
        print("fallback text rows:", rows.count())
    rows.first.click()
    page.wait_for_timeout(2500)
    state = page.evaluate("""() => ({
      isThread: document.documentElement.classList.contains('is-thread') || !!document.querySelector('.is-thread'),
      composer: !!document.querySelector('textarea, .msg-composer, [contenteditable=true]'),
      placeholder: (document.body.innerText || '').includes('Выберите диалог'),
      bubbles: document.querySelectorAll('.msg-bubble, .message-bubble, [data-message-id]').length,
      url: location.href,
    })""")
    print("thread state:", state, "errors:", errs[:3])
    page.screenshot(path="/tmp/shots_user2/thread_open.png", full_page=True)

    print("=== mobile menu ===")
    errs.clear()
    page.goto(f"{BASE}/", wait_until="load", timeout=45000)
    page.wait_for_timeout(2000)
    page.locator(".mobile-menu-btn, button[aria-label='Меню']").first.click()
    page.wait_for_timeout(1200)
    menu = page.evaluate("""() => {
      const m = document.querySelector('.mobile-menu');
      if (!m) return { open: false };
      const nav = m.querySelector('.mobile-menu__nav');
      return {
        open: getComputedStyle(m).display !== 'none',
        scrollable: nav ? nav.scrollHeight > nav.clientHeight + 4 : null,
        overflowY: nav ? getComputedStyle(nav).overflowY : null,
        links: m.querySelectorAll('a').length,
        bodyLocked: getComputedStyle(document.body).overflow,
      };
    }""")
    print("menu:", menu, "errors:", errs[:3])
    page.screenshot(path="/tmp/shots_user2/mobile_menu.png", full_page=False)
    browser.close()
