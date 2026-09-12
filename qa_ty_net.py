#!/usr/bin/env python3
"""Trace failing requests + hydration errors on ty."""
from __future__ import annotations

import sys

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE

PATHS = sys.argv[1:] or ["/", "/events", "/login"]

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    bad: list[str] = []
    page.on("response", lambda r: bad.append(f"{r.status} {r.request.method} {r.url}") if r.status >= 400 else None)
    page.on("pageerror", lambda e: bad.append(f"PAGEERROR {str(e)[:200]}"))
    page.on("console", lambda m: bad.append(f"CONSOLE {m.type} {m.text[:220]}") if m.type == "error" else None)
    for p in PATHS:
        bad.clear()
        page.goto(f"{BASE}{p}", wait_until="load", timeout=45000)
        page.wait_for_timeout(3000)
        print(f"=== {p} ===")
        for b in dict.fromkeys(bad):
            print("  ", b)
    browser.close()
