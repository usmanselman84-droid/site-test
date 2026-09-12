#!/usr/bin/env python3
"""Full-site QA sweep for ty staging: captcha login per role + timed page audit."""
from __future__ import annotations

import io
import os
import re
import sys
import time
from dataclasses import dataclass, field

import requests
from PIL import Image

BASE = os.environ.get("QA_BASE", "https://ty.idivles.ru").rstrip("/")
PASS = os.environ.get("QA_PASS", "RolePass123!")

TAG_BY_TITLE = {
    "деревья": "tree",
    "машины": "car",
    "дома": "house",
    "животные": "cat",
}


TILE_COLORS = {
    "tree": [(0x3D, 0x6B, 0x40)],
    "car": [(0x1E, 0x4E, 0x8C)],
    "house": [(0x9B, 0x2C, 0x2C), (0xB9, 0x1C, 0x1C)],
    "cat": [(0xC0, 0x56, 0x21)],
}


def classify(png: bytes) -> str:
    """Match the tile's dominant shape colour against the known SVG palette."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    counts: dict[str, int] = {tag: 0 for tag in TILE_COLORS}
    for count, (r, g, b) in im.getcolors(maxcolors=1 << 20) or []:
        best, dist = None, 60 * 60
        for tag, refs in TILE_COLORS.items():
            for rr, rg, rb in refs:
                d = (r - rr) ** 2 + (g - rg) ** 2 + (b - rb) ** 2
                if d < dist:
                    best, dist = tag, d
        if best:
            counts[best] += count
    tag = max(counts, key=lambda k: counts[k])
    return tag if counts[tag] > 50 else "unknown"


def solve_captcha(s: requests.Session) -> str:
    ch = s.get(f"{BASE}/api/captcha/challenge", timeout=30).json()
    q = ch.get("question", "")
    tag = next((t for title, t in TAG_BY_TITLE.items() if title in q), None)
    if not tag:
        raise RuntimeError(f"unknown captcha question: {q}")
    selected = []
    for tile in ch.get("tiles", []):
        img = s.get(f"{BASE}{tile['src']}", timeout=30).content
        if classify(img) == tag:
            selected.append(tile["id"])
    res = s.post(
        f"{BASE}/api/captcha/challenge",
        json={"challengeId": ch["challengeId"], "selected": selected, "website": ""},
        timeout=30,
    )
    data = res.json()
    if not data.get("token"):
        raise RuntimeError(f"captcha solve failed: {res.status_code} {data}")
    return data["token"]


def login(email: str, password: str = PASS) -> tuple[requests.Session, dict]:
    s = requests.Session()
    s.headers["User-Agent"] = "yp-qa-audit/1.0"
    csrf = s.get(f"{BASE}/api/auth/csrf", timeout=30).json()["csrfToken"]
    token = solve_captcha(s)
    s.post(
        f"{BASE}/api/auth/callback/credentials",
        data={
            "csrfToken": csrf,
            "email": email,
            "password": password,
            "json": "true",
            "callbackUrl": f"{BASE}/dashboard",
            "requireCaptcha": "1",
            "captchaToken": token,
            "website": "",
        },
        allow_redirects=False,
        timeout=60,
    )
    session = s.get(f"{BASE}/api/auth/session", timeout=30).json()
    return s, session


@dataclass
class Finding:
    role: str
    path: str
    status: int
    secs: float
    size: int
    note: str = ""


HINTS = [
    (re.compile(r"Application error|client-side exception", re.I), "APP_ERROR"),
    (re.compile(r"Internal Server Error", re.I), "SERVER_ERROR"),
    (re.compile(r"Что-то пошло не так|Произошла ошибка", re.I), "ERROR_UI"),
    (re.compile(r"Ничего не найдено|Пока ничего нет|Пусто", re.I), "EMPTY_STATE"),
]


def probe(s: requests.Session | None, role: str, path: str) -> Finding:
    getter = s.get if s else requests.get
    t0 = time.time()
    try:
        r = getter(f"{BASE}{path}", allow_redirects=False, timeout=60)
    except Exception as exc:  # noqa: BLE001
        return Finding(role, path, 0, time.time() - t0, 0, f"EXC {exc}"[:120])
    dt = time.time() - t0
    body = r.text if r.status_code == 200 else ""
    notes = [tag for rx, tag in HINTS if rx.search(body)]
    if 300 <= r.status_code < 400:
        notes.append(f"→ {r.headers.get('location', '')}")
    if dt > 1.5:
        notes.append("SLOW")
    return Finding(role, path, r.status_code, dt, len(r.content), " ".join(notes))


def sweep(s, role: str, paths: list[str]) -> list[Finding]:
    out = []
    for p in paths:
        f = probe(s, role, p)
        out.append(f)
        print(f"{role:11s} {p:38s} {f.status:3d} {f.secs:6.2f}s {f.size:8d}B {f.note}")
    return out


CABINET = [
    "/dashboard",
    "/dashboard/me",
    "/dashboard/edit",
    "/dashboard/messages",
    "/dashboard/friends",
    "/dashboard/notifications",
    "/dashboard/achievements",
    "/dashboard/applications",
    "/dashboard/awards",
    "/dashboard/briefings",
    "/dashboard/games",
    "/dashboard/guides",
    "/dashboard/portfolio",
    "/dashboard/referrals",
    "/dashboard/rewards",
    "/dashboard/settings",
    "/dashboard/shop",
    "/dashboard/showcase",
    "/dashboard/tickets",
    "/profile",
    "/messages",
    "/friends",
    "/tickets",
]

ADMIN = [
    "/admin",
    "/admin/about-team",
    "/admin/activity",
    "/admin/applications",
    "/admin/audit-log",
    "/admin/awards",
    "/admin/backup",
    "/admin/bookings",
    "/admin/bots",
    "/admin/clubs",
    "/admin/contests",
    "/admin/documents",
    "/admin/faq",
    "/admin/moderation",
    "/admin/news",
    "/admin/occupancy",
    "/admin/online",
    "/admin/pages",
    "/admin/pending-users",
    "/admin/places",
    "/admin/portfolios",
    "/admin/programs",
    "/admin/projects",
    "/admin/rkn",
    "/admin/scanner",
    "/admin/security",
    "/admin/settings",
    "/admin/spaces",
    "/admin/stats",
    "/admin/system",
    "/admin/users",
    "/admin/vacancies",
]

ROLES = [
    ("USER", "user@sochi.ru", CABINET),
    ("ADMIN", "qa-admin@sochi.ru", CABINET + ADMIN),
]


def main() -> None:
    findings: list[Finding] = []
    only = sys.argv[1:] or None
    for role, email, paths in ROLES:
        if only and role not in only:
            continue
        try:
            s, session = login(email, PASS)
        except Exception as exc:  # noqa: BLE001
            print(f"!! login {role} {email} failed: {exc}")
            continue
        user = (session or {}).get("user") or {}
        if not user.get("id"):
            print(f"!! login {role} {email}: no session ({session})")
            continue
        print(f"== {role} {email} in as role={user.get('role')} ==")
        findings += sweep(s, role, paths)

    bad = [f for f in findings if f.status >= 400 or f.status == 0 or "ERROR" in f.note]
    slow = sorted((f for f in findings if f.secs > 1.5), key=lambda f: -f.secs)
    print("\n=== PROBLEMS ===")
    for f in bad:
        print(f"{f.role} {f.path} {f.status} {f.note}")
    print("\n=== SLOWEST ===")
    for f in slow[:20]:
        print(f"{f.secs:6.2f}s {f.role} {f.path}")


if __name__ == "__main__":
    main()
