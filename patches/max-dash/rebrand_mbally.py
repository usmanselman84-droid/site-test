#!/usr/bin/env python3
"""User-facing мбаллы → М-баллы. Do not touch CSS class names or API paths."""
from pathlib import Path

ROOT = Path("/opt/sochi-portal-staging/src")
FILES = [
    "lib/faq-content.ts",
    "lib/user-action-log-shared.ts",
    "lib/legal-dynamic.ts",
    "lib/profile-level.ts",
    "lib/system-pages.ts",
    "lib/privacy-document.ts",
    "lib/achievements.ts",
    "lib/presentation-defaults.ts",
    "lib/score-scales.ts",
    "lib/collectibles.ts",
    "lib/eco-points.ts",
    "lib/referrals.ts",
    "app/check-in/page.tsx",
    "app/faq/page.tsx",
    "app/api/check-in/venue/route.ts",
    "app/api/admin/eco/route.ts",
    "components/CollectiblesPanel.tsx",
    "components/EcoPoolHint.tsx",
    "components/admin/AdminContestsClient.tsx",
]

repls = [
    ("Эко: основная валюта", "М-баллы: основная валюта"),
    ("мбаллами", "М-баллами"),
    ("мбаллах", "М-баллах"),
    ("мбаллов", "М-баллов"),
    ("мбалле", "М-балле"),
    ("мбаллы", "М-баллы"),
    ("мбалл", "М-балл"),
    ("Мбаллы", "М-баллы"),
    ("Мбалл", "М-балл"),
]

for rel in FILES:
    p = ROOT / rel
    if not p.exists():
        print("missing", rel)
        continue
    t = p.read_text()
    orig = t
    for a, b in repls:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t)
        print("updated", rel)
    else:
        print("skip", rel)
