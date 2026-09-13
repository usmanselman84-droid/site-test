'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { isFairyAvatarUrl } from '@/lib/privacy-alias';

type Badge = { label: string; color: string; title?: string };

type UserAvatarProps = {
  name: string | null | undefined;
  image: string | null | undefined;
  size?: number;
  className?: string;
  style?: CSSProperties;
  aliased?: boolean;
  online?: boolean | null;
  showStatus?: boolean;
  frameColor?: string | null;
  frameGlow?: string | null;
  badges?: Badge[];
  /** Extra ring. Header icon buttons already have a lime border — set false there. */
  framed?: boolean;
};

function cornerRadius(size: number) {
  return Math.max(8, Math.round(size * 0.25));
}

function sanitizeSrc(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || value === 'null' || value === 'undefined') return null;
  try {
    if (value.includes('/_next/image')) {
      const q = value.split('url=')[1];
      if (q) return decodeURIComponent(q.split('&')[0]);
    }
  } catch {
    /* keep original */
  }
  return value;
}

function initialsNode(
  name: string | null | undefined,
  aliased: boolean | undefined,
  shared: CSSProperties
) {
  const size = Number(shared.width) || 44;
  return (
    <div
      aria-hidden
      className="user-avatar-face"
      style={{
        ...shared,
        display: 'grid',
        placeItems: 'center',
        background: aliased
          ? 'linear-gradient(135deg, #0A0C2A, #8562D8)'
          : 'linear-gradient(145deg, #0A0C2A 0%, #8562D8 58%, #AFCA03 140%)',
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.max(12, Math.round(size * 0.36)),
        fontFamily: aliased ? "Georgia, 'Times New Roman', serif" : undefined,
      }}
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function UserAvatar({
  name,
  image,
  size = 44,
  className,
  style,
  aliased,
  online,
  showStatus,
  frameColor,
  badges,
  framed = true,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const radius = cornerRadius(size);
  const src = sanitizeSrc(image);
  const ring = framed ? frameColor || '#afca03' : 'transparent';
  const shared: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    objectFit: 'cover',
    objectPosition: 'center',
    flex: '0 0 auto',
    border: framed ? `1.5px solid ${ring}` : '0',
    overflow: 'hidden',
    display: 'block',
    ...style,
  };

  const dot =
    showStatus && online != null ? (
      <span
        aria-hidden
        title={online ? 'в сети' : 'не в сети'}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: Math.max(8, Math.round(size * 0.22)),
          height: Math.max(8, Math.round(size * 0.22)),
          borderRadius: '50%',
          background: online ? '#22c55e' : '#94a3b8',
          border: '2px solid #fff',
          zIndex: 2,
        }}
      />
    ) : null;

  const badgeNodes =
    badges && badges.length > 0 ? (
      <span className="avatar-badge-under" aria-hidden>
        {badges.slice(0, 3).map((b, i) => (
          <span
            key={`${b.label}-${i}`}
            className="avatar-badge avatar-badge--under"
            title={b.title || b.label}
            style={{ background: b.color }}
          >
            {b.label}
          </span>
        ))}
      </span>
    ) : null;

  const wrap = (node: ReactNode) => (
    <span
      className={`user-avatar-wrap${badges?.length ? ' has-under-badges' : ''}${className ? ` ${className}` : ''}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: badges?.length ? 4 : 0,
        width: size,
        height: badges?.length ? undefined : size,
        flex: '0 0 auto',
        overflow: badges?.length ? 'visible' : 'hidden',
        borderRadius: radius,
      }}
    >
      <span
        className="user-avatar-inner"
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'block',
          overflow: 'hidden',
          borderRadius: radius,
        }}
      >
        {node}
        {dot}
      </span>
      {badgeNodes}
    </span>
  );

  const showImage = Boolean(src) && !imgFailed;

  if (showImage && src) {
    return wrap(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="user-avatar-face"
        style={shared}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return wrap(initialsNode(name, aliased || isFairyAvatarUrl(src), shared));
}
