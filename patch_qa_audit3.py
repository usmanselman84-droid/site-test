#!/usr/bin/env python3
"""ty audit fixes, part 3: contacts nested link, coworking hydration-safe gate."""
from pathlib import Path

ROOT = Path("/opt/sochi-portal-staging")


def edit(rel: str, old: str, new: str, label: str) -> None:
    p = ROOT / rel
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"FAIL {label}: pattern not found in {rel}")
    p.write_text(text.replace(old, new, 1))
    print("OK", label)


# ---------------------------------------------- 1) contacts: <a> inside <a>
# The row is already a link, so the icon must not be one too.
edit(
    "src/components/SocialIcons.tsx",
    """export function SocialIconLink({
  kind,
  href,
  size = 40,
}: {
  kind: SocialKind;
  href: string;
  size?: number;
}) {
  const m = META[kind];
  const Icon = m.Icon;
  const iconSize = kind === 'max' ? Math.round(size * 0.52) : Math.round(size * 0.45);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.label}
      title={m.label}
      className="social-icon-link\"""",
    """/** Icon badge without its own link — safe inside an enclosing anchor. */
export function SocialIconBadge({ kind, size = 40 }: { kind: SocialKind; size?: number }) {
  const m = META[kind];
  const Icon = m.Icon;
  const iconSize = kind === 'max' ? Math.round(size * 0.52) : Math.round(size * 0.45);
  return (
    <span
      aria-hidden
      className="social-icon-link"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#f1f5f9',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: m.color,
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} />
    </span>
  );
}

export function SocialIconLink({
  kind,
  href,
  size = 40,
}: {
  kind: SocialKind;
  href: string;
  size?: number;
}) {
  const m = META[kind];
  const Icon = m.Icon;
  const iconSize = kind === 'max' ? Math.round(size * 0.52) : Math.round(size * 0.45);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.label}
      title={m.label}
      className="social-icon-link\"""",
    "SocialIcons: add non-link badge",
)

edit(
    "src/app/contacts/page.tsx",
    "import { SocialIconLink } from '@/components/SocialIcons';",
    "import { SocialIconBadge } from '@/components/SocialIcons';",
    "contacts: import badge",
)

edit(
    "src/app/contacts/page.tsx",
    """                    <SocialIconLink
                      kind={s.key as 'vk' | 'tg' | 'ok' | 'whatsapp' | 'rutube' | 'max'}
                      href={(settings as any)[s.key + 'Link']}
                      size={36}
                    />""",
    """                    <SocialIconBadge
                      kind={s.key as 'vk' | 'tg' | 'ok' | 'whatsapp' | 'rutube' | 'max'}
                      size={36}
                    />""",
    "contacts: icon badge instead of nested link",
)

# --------------------------------- 2) coworking gate: same first paint as server
# Reading localStorage during render made the client's first paint differ from SSR.
edit(
    "src/components/CoworkingGuestGate.tsx",
    "import type { ReactNode } from 'react';",
    "import { useEffect, useState } from 'react';\nimport type { ReactNode } from 'react';",
    "coworking gate: import hooks",
)

edit(
    "src/components/CoworkingGuestGate.tsx",
    """  const { data: session, status } = useSession();
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;""",
    """  const { data: session, status } = useSession();
  // Server can't read localStorage, so the guest hint waits for mount — otherwise
  // the first client paint differs from SSR and React bails out (#418).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;""",
    "coworking gate: mounted flag",
)

edit(
    "src/components/CoworkingGuestGate.tsx",
    "    const maybeGuest = typeof window !== 'undefined' && window.localStorage.getItem('yp-session') !== '1';",
    "    const maybeGuest = mounted && window.localStorage.getItem('yp-session') !== '1';",
    "coworking gate: read storage after mount",
)

print("part 3 done")
