import type { ReactNode } from 'react';
import Link from 'next/link';

type Action = { href: string; label: string };

/** Homepage and catalog feed card (events, projects teasers). */
export default function HomeLiftFeedCard({
  href,
  cover,
  badge,
  title,
  line,
  highlight,
  primary,
  secondary,
  actions,
}: {
  href: string;
  cover: ReactNode;
  badge?: string;
  title: string;
  line?: string | null;
  highlight?: string | null;
  primary?: Action;
  secondary?: Action | null;
  actions?: ReactNode;
}) {
  return (
    <article className="free-now-card yp-feed-card lift-feed-card">
      <Link href={href} className="lift-feed-card__media" aria-label={title}>
        <div className="free-now-avatar yp-feed-card__media">
          {cover}
          {badge ? <span className="free-now-badge">{badge}</span> : null}
        </div>
      </Link>
      <div className="free-now-body">
        <h3>{title}</h3>
        {line ? <p>{line}</p> : null}
        {highlight ? <strong className="free-now-slot">{highlight}</strong> : null}
        <div className="free-now-actions">
          {actions ? (
            actions
          ) : (
            <>
              {secondary ? (
                <Link href={secondary.href} className="lift-hero__btn lift-hero__btn--ghost">
                  {secondary.label}
                </Link>
              ) : null}
              {primary ? (
                <Link href={primary.href} className="lift-hero__btn lift-hero__btn--lime">
                  {primary.label}
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
