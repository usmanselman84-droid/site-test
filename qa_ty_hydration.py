#!/usr/bin/env python3
"""Isolate the React #418 hydration mismatch source on ty by blocking boot scripts."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE

PATHS = ["/", "/clubs", "/events"]
CASES = {
    "baseline": [],
    "no-header-boot": ["**/brand/header-boot.js*"],
    "no-any-boot": ["**/brand/*-boot.js*"],
    "no-brand-assets": ["**/brand/*"],
}


def run_case(pw, name: str, blocks: list[str]) -> None:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    for pattern in blocks:
        ctx.route(pattern, lambda route: route.abort())
    page = ctx.new_page()
    errs: list[str] = []
    page.on("pageerror", lambda e: errs.append(str(e)[:80]))
    line = []
    for p in PATHS:
        errs.clear()
        page.goto(f"{BASE}{p}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2500)
        hyd = sum(1 for e in errs if "418" in e or "423" in e or "hydrat" in e.lower())
        line.append(f"{p}:{'#418' if hyd else 'ok'}")
    print(f"{name:16s} " + "  ".join(line))
    browser.close()


with sync_playwright() as pw:
    for name, blocks in CASES.items():
        run_case(pw, name, blocks)
