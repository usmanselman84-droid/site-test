'use client';

import type { MouseEvent, ReactNode } from 'react';
import { pushCatalogUrl } from '@/lib/use-safe-search-params';

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
};

export function catalogPageHref(
  basePath: string,
  page: number,
  query?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v) params.set(k, v);
    }
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function PageLink({
  href,
  className,
  rel,
  children,
}: {
  href: string;
  className: string;
  rel?: string;
  children: ReactNode;
}) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    pushCatalogUrl(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <a href={href} className={className} rel={rel} onClick={go}>
      {children}
    </a>
  );
}

export default function CatalogPagination({ page, totalPages, basePath, query }: Props) {
  if (totalPages <= 1) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let p = windowStart; p <= windowEnd; p += 1) pages.push(p);

  return (
    <nav className="catalog-pagination" aria-label="Страницы">
      {prev ? (
        <PageLink href={catalogPageHref(basePath, prev, query)} className="catalog-pagination__btn" rel="prev">
          ← Назад
        </PageLink>
      ) : (
        <span className="catalog-pagination__btn is-disabled">← Назад</span>
      )}
      <div className="catalog-pagination__pages">
        {windowStart > 1 && (
          <>
            <PageLink href={catalogPageHref(basePath, 1, query)} className="catalog-pagination__num">
              1
            </PageLink>
            {windowStart > 2 ? <span className="catalog-pagination__dots">…</span> : null}
          </>
        )}
        {pages.map((p) =>
          p === page ? (
            <span key={p} className="catalog-pagination__num is-active" aria-current="page">
              {p}
            </span>
          ) : (
            <PageLink key={p} href={catalogPageHref(basePath, p, query)} className="catalog-pagination__num">
              {p}
            </PageLink>
          )
        )}
        {windowEnd < totalPages && (
          <>
            {windowEnd < totalPages - 1 ? <span className="catalog-pagination__dots">…</span> : null}
            <PageLink href={catalogPageHref(basePath, totalPages, query)} className="catalog-pagination__num">
              {totalPages}
            </PageLink>
          </>
        )}
      </div>
      {next ? (
        <PageLink href={catalogPageHref(basePath, next, query)} className="catalog-pagination__btn" rel="next">
          Далее →
        </PageLink>
      ) : (
        <span className="catalog-pagination__btn is-disabled">Далее →</span>
      )}
    </nav>
  );
}
