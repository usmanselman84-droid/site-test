#!/usr/bin/env python3
"""Viewport-sized screenshots (no full page) for readable visual review.

Usage: python3 qa_ty_crop.py <role> <outdir> <path[:scrollY]> ...
"""
from __future__ import annotations

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

role, outdir = sys.argv[1], sys.argv[2]
specs = sys.argv[3:]
os.makedirs(outdir, exist_ok=True)

cookies = []
if role != "guest":
    email = {"admin": "qa-admin@sochi.ru", "user": "user@sochi.ru"}[role]
    s, session = login(email, PASS)
    assert (session.get("user") or {}).get("id")
    cookies = [{"name": c.name, "value": c.value, "domain": c.domain or "ty.idivles.ru", "path": c.path or "/",
                "httpOnly": True, "secure": True, "sameSite": "Lax"} for c in s.cookies]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True,
                              has_touch=True)
    ctx.add_init_script(f"({CONSENT_JS})();")
    if cookies:
        ctx.add_cookies(cookies)
    page = ctx.new_page()
    for spec in specs:
        path, _, scroll = spec.partition(":")
        page.goto(f"{BASE}{path}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2500)
        if scroll:
            page.evaluate(f"window.scrollTo(0, {int(scroll)})")
            page.wait_for_timeout(600)
        name = (path.strip("/").replace("/", "_") or "home") + (f"_y{scroll}" if scroll else "") + ".png"
        page.screenshot(path=os.path.join(outdir, name))
        print("shot", os.path.join(outdir, name))
    browser.close()
