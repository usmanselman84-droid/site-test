'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import EntityCoverImage from '@/components/EntityCoverImage';
import { ArrowRight } from 'lucide-react';

/** Shared catalog card for projects, clubs and similar entity grids. */
export default function CatalogEntityCard({
  href,
  title,
  cover,
  fallback,
  badge,
  badgeDone,
  category,
  excerpt,
  who,
  metaLeft,
  children,
  priority,
  sizes = '(max-width: 768px) 100vw, 33vw',
}: {
  href: string;
  title: string;
  cover: string;
  fallback: string;
  badge: string;
  badgeDone?: boolean;
  category?: string | null;
  excerpt?: string | null;
  who?: string | null;
  metaLeft?: string | null;
  children?: ReactNode;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Link href={href} className="catalog-card">
      <div className={`catalog-badge${badgeDone ? ' status-completed' : ''}`}>{badge}</div>
      <div className="catalog-img-wrap" style={{ position: 'relative' }}>
        <EntityCoverImage
          src={cover}
          alt={title}
          fallback={fallback}
          className="catalog-img"
          sizes={sizes}
          priority={priority}
        />
      </div>
      <div className="catalog-card__body">
        {category ? <span className="catalog-card__cat">{category}</span> : null}
        <h3>{title}</h3>
        {excerpt ? <p className="line-clamp-3">{excerpt}</p> : null}
        {who && who !== excerpt ? <p className="catalog-card__who">Кому: {who}</p> : null}
        {children}
        {metaLeft ? (
          <div className="catalog-card-meta">
            <span>{metaLeft}</span>
            <span>
              Подробнее <ArrowRight size={16} />
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
