#!/usr/bin/env python3
"""Full-page screenshots of ty pages for visual review.

Usage: python3 qa_ty_shots.py <role> <outdir> <path> [path...]
"""
from __future__ import annotations

import os
import sys

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE, PASS, login

role = sys.argv[1]
outdir = sys.argv[2]
paths = sys.argv[3:]
os.makedirs(outdir, exist_ok=True)

cookies = []
if role != "guest":
    email = {"admin": "qa-admin@sochi.ru", "user": "user@sochi.ru"}[role]
    s, session = login(email, PASS)
    assert (session.get("user") or {}).get("id"), f"login failed: {session}"
    cookies = [
        {"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
         "httpOnly": True, "secure": True, "sameSite": "Lax"}
        for c in s.cookies
    ]


CONSENT_JS = """() => {
  try {
    localStorage.setItem('yp_cookie_consent_v3', JSON.stringify({
      necessary: true, analytics: true, preferences: true,
      at: new Date().toISOString(), version: '2026-09-07-portal',
    }));
  } catch (e) {}
}"""

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                              has_touch=True,
                              user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    ctx.add_init_script(f"({CONSENT_JS})();")
    if cookies:
        ctx.add_cookies(cookies)
    page = ctx.new_page()
    for p in paths:
        page.goto(f"{BASE}{p}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2500)
        name = (p.strip("/").replace("/", "_") or "home") + ".png"
        page.screenshot(path=os.path.join(outdir, name), full_page=True)
        print("shot", os.path.join(outdir, name))
    browser.close()
