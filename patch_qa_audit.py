#!/usr/bin/env python3
"""ty full-audit fixes: hydration, guest 401, admin mobile bar, cabinet padding, nested link."""
from pathlib import Path

ROOT = Path("/opt/sochi-portal-staging")


def edit(rel: str, old: str, new: str, label: str, required: bool = True) -> None:
    p = ROOT / rel
    text = p.read_text()
    if new in text:
        print("skip (already applied)", label)
        return
    if old not in text:
        msg = f"FAIL {label}: pattern not found in {rel}"
        if required:
            raise SystemExit(msg)
        print(msg)
        return
    p.write_text(text.replace(old, new, 1))
    print("OK", label)


# ---------------------------------------------------------------- 1) nested <a>
# CatalogEntityCard wraps the whole card in <Link>; a route link inside it makes
# <a> inside <a>, which the browser reparents and React then fails to hydrate (#418).
edit(
    "src/components/catalog/ClubsCatalogClient.tsx",
    """                    <span style={{ position: 'relative', zIndex: 2 }}>
                      <MapPin size={14} /> {club.meetingPlace}
                      <YandexDirections address={club.meetingPlace} placeName={club.title} compact />
                    </span>""",
    """                    <span>
                      <MapPin size={14} /> {club.meetingPlace}
                    </span>""",
    "clubs card: drop nested route link (hydration #418)",
)

# Drop the now-unused import so the build stays clean.
edit(
    "src/components/catalog/ClubsCatalogClient.tsx",
    "import YandexDirections from '@/components/YandexDirections';\n",
    "",
    "clubs card: remove unused import",
)

# ------------------------------------------------------- 2) admin mobile bar row
# 'top'/'main' areas with no explicit rows + min-height:100dvh let the sticky bar
# stretch to ~292px on phones. Pin the top row to its content.
edit(
    "src/app/globals.css",
    """  .admin-layout-wrapper {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'top'
      'main';
    min-height: 100dvh;
  }""",
    """  .admin-layout-wrapper {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      'top'
      'main';
    min-height: 100dvh;
  }""",
    "admin mobile bar: pin top grid row",
)

# ------------------------------------------------- 3) cabinet main-content gap
# The padding dates back to the fixed cabinet chrome. The real Navbar is sticky
# and already occupies space, so the padding shows as an empty band.
for rel, old in (
    (
        "src/app/globals.css",
        """html.is-cabinet:not(.yp-messages-flow):not(:has(.profile-edit-page)) .main-content,
body.is-cabinet:not(.yp-messages-flow):not(:has(.profile-edit-page)) .main-content {
  padding-top: var(--nav-h, 3.75rem);""",
    ),
):
    edit(
        rel,
        old,
        old.replace("padding-top: var(--nav-h, 3.75rem);", "padding-top: 0;"),
        f"cabinet padding-top in {rel}",
        required=False,
    )

# ------------------------------------------------------- 4) admin users: nophone
edit(
    "src/app/admin/users/page.tsx",
    "<div style={{ fontSize: '0.8rem' }}>{user.phone || 'Нет телефона'}</div>",
    "<div style={{ fontSize: '0.8rem' }}>\n"
    "                    {user.phone && !user.phone.startsWith('nophone:') ? user.phone : 'Нет телефона'}\n"
    "                  </div>",
    "admin users: hide nophone: placeholder",
)

print("source patches done")
