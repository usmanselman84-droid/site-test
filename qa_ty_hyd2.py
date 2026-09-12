#!/usr/bin/env python3
"""Narrow down which header-boot behaviour still triggers React #418."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

from qa_ty_audit import BASE

PATHS = ["/", "/events"]

HTML_CLASSES_ONLY = """() => {
  document.documentElement.classList.add('is-cabinet', 'has-session', 'yp-cabinet-flow');
}"""


def check(ctx, label: str) -> None:
    page = ctx.new_page()
    errs: list[str] = []
    page.on("pageerror", lambda e: errs.append(str(e)[:60]))
    res = []
    for p in PATHS:
        errs.clear()
        page.goto(f"{BASE}{p}", wait_until="load", timeout=45000)
        page.wait_for_timeout(2500)
        res.append(f"{p}:{'#418' if any('418' in e for e in errs) else 'ok'}")
    print(f"{label:26s} " + "  ".join(res))
    page.close()


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    check(ctx, "baseline (boot on)")
    ctx.close()

    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    ctx.route("**/brand/header-boot.js*", lambda r: r.abort())
    check(ctx, "boot blocked")
    ctx.close()

    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    ctx.route("**/brand/header-boot.js*", lambda r: r.abort())
    ctx.add_init_script(f"({HTML_CLASSES_ONLY})();")
    check(ctx, "html classes only")
    ctx.close()

    browser.close()
