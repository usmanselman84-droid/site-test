#!/usr/bin/env python3
"""Defer every header-boot DOM mutator until React has hydrated (kills #418)."""
import re
from pathlib import Path

BOOT = Path("/opt/sochi-portal-staging/public/brand/header-boot.js")
js = BOOT.read_text()
MARK = "qa-hydration-guard-20260912"
if MARK in js:
    raise SystemExit("already applied")

before = js

# if (loading) addEventListener('DOMContentLoaded', fn); else fn();
js = re.sub(
    r'if\(document\.readyState==="loading"\)\s*document\.addEventListener\("DOMContentLoaded",\s*(\w+)\);\s*\n\s*else\s+\1\(\);',
    r"window.ypAfterHydration(\1);",
    js,
)
# if (!loading) fn(); else addEventListener('DOMContentLoaded', fn);
js = re.sub(
    r'if\(document\.readyState!=="loading"\)\s*(\w+)\(\);\s*\n\s*else\s+document\.addEventListener\("DOMContentLoaded",\s*\1\);',
    r"window.ypAfterHydration(\1);",
    js,
)
# leftover single-line registrations
js = re.sub(
    r'if\(document\.readyState==="loading"\)\s*document\.addEventListener\("DOMContentLoaded",\s*(\w+)\);',
    r"window.ypAfterHydration(\1);",
    js,
)
# timed re-runs: keep the cadence but never mutate before hydration
js = re.sub(
    r"setTimeout\((\w+),\s*(\d+)\);",
    r"setTimeout(function(){ window.ypAfterHydration(\1); }, \2);",
    js,
)

count = len(re.findall(r"ypAfterHydration", js))
if count < 6:
    raise SystemExit(f"unexpected rewrite count: {count}")

BOOT.write_text(f"/* {MARK} */\n" + js)
print(f"OK rewrote {len(before) - len(js)} bytes delta, ypAfterHydration hooks: {count}")
