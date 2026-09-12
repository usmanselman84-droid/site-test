#!/usr/bin/env python3
"""Timed API sweep on ty for real cabinet + admin GET endpoints."""
from __future__ import annotations

import time

from qa_ty_audit import BASE, PASS, login

USER_API = [
    "/api/user/profile",
    "/api/user/notifications",
    "/api/user/achievements",
    "/api/user/applications",
    "/api/user/awards",
    "/api/user/bookings",
    "/api/user/collectibles",
    "/api/user/eco",
    "/api/user/gallery",
    "/api/user/games",
    "/api/user/instructions",
    "/api/user/participations",
    "/api/user/portfolio",
    "/api/user/profile-tags",
    "/api/user/reputation",
    "/api/user/security",
    "/api/user/notification-prefs",
    "/api/messages",
    "/api/friends",
    "/api/referrals",
    "/api/events",
    "/api/places",
    "/api/coworking",
    "/api/contests",
    "/api/vacancies",
    "/api/games/leaderboard",
    "/api/eco/pool",
    "/api/public/gallery",
    "/api/public/status",
    "/api/public/about-team",
    "/api/health",
]

ADMIN_API = [
    "/api/admin/stats",
    "/api/admin/nav-counts",
    "/api/admin/activity",
    "/api/admin/insights",
    "/api/admin/moderation",
    "/api/admin/online-users",
    "/api/admin/occupancy",
    "/api/admin/pending-users",
    "/api/admin/portfolios",
    "/api/admin/security",
    "/api/admin/system",
    "/api/admin/scores",
    "/api/admin/modules",
    "/api/admin/awards",
    "/api/admin/contests",
    "/api/admin/vacancies",
    "/api/admin/faq",
    "/api/admin/bots",
    "/api/admin/about-team",
    "/api/admin/profile-tags",
    "/api/admin/eco",
    "/api/admin/backup",
    "/api/admin/replica",
    "/api/admin/rkn-blocklist",
    "/api/admin/max",
    "/api/admin/users/search?q=qa",
]


def sweep(s, label: str, paths: list[str]) -> list[tuple[str, int, float, int]]:
    rows = []
    for p in paths:
        t0 = time.time()
        try:
            r = s.get(f"{BASE}{p}", timeout=90, allow_redirects=False)
        except Exception as exc:  # noqa: BLE001
            print(f"{label:6s} {p:40s} EXC {exc}")
            rows.append((p, 0, time.time() - t0, 0))
            continue
        dt = time.time() - t0
        note = "SLOW" if dt > 1.0 else ""
        if r.status_code >= 400:
            note += " " + r.text[:100].replace("\n", " ")
        print(f"{label:6s} {p:40s} {r.status_code:3d} {dt:6.2f}s {len(r.content):8d}B {note}")
        rows.append((p, r.status_code, dt, len(r.content)))
    return rows


def main() -> None:
    s, session = login("qa-admin@sochi.ru", PASS)
    print("admin session:", (session.get("user") or {}).get("role"))
    rows = sweep(s, "user", USER_API) + sweep(s, "admin", ADMIN_API)
    print("\n=== SLOWEST APIs ===")
    for p, code, dt, size in sorted(rows, key=lambda r: -r[2])[:15]:
        print(f"{dt:6.2f}s {code} {p} {size}B")
    print("\n=== BAD ===")
    for p, code, dt, size in rows:
        if code == 0 or code >= 400:
            print(f"{code} {p}")


if __name__ == "__main__":
    main()
