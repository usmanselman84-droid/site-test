'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import JoinEventButton from '@/components/JoinEventButton';
import EntityCoverImage from '@/components/EntityCoverImage';
import CatalogPagination from '@/components/CatalogPagination';
import { CATALOG_PAGE_SIZE, catalogSlice, totalPages } from '@/lib/pagination';
import { useSafeSearchParams } from '@/lib/use-safe-search-params';

type ApiEvent = {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  space?: { title?: string; address?: string; image?: string | null } | null;
  participantsCount?: number;
  joinedByMe?: boolean;
};

export default function AuthAfishaSection({ hideTitle }: { hideTitle?: boolean }) {
  const { status } = useSession();
  const sp = useSafeSearchParams();
  const page = catalogSlice(sp.get('page') || '1').page;
  const [events, setEvents] = useState<ApiEvent[] | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    fetch('/api/events')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) setEvents(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const paged = useMemo(() => {
    const list = (events || []).filter((e) => new Date(e.startTime).getTime() >= Date.now() - 60 * 60 * 1000);
    const { skip, take } = catalogSlice(page);
    return {
      items: list.slice(skip, skip + take),
      pages: totalPages(list.length, CATALOG_PAGE_SIZE),
      skip,
    };
  }, [events, page]);

  if (status !== 'authenticated') {
    return (
      <div className="event-empty">
        <h3>Афиша доступна после входа</h3>
        <p>Войдите в аккаунт, чтобы увидеть ближайшие мероприятия.</p>
        <Link href="/login?callbackUrl=/events" className="lift-hero__btn lift-hero__btn--lime">
          Войти
        </Link>
      </div>
    );
  }

  if (events == null) {
    return <p style={{ color: 'var(--muted)' }}>Загрузка афиши…</p>;
  }

  if (!events.length) {
    return (
      <div className="event-empty">
        <h3>Ближайших мероприятий пока нет</h3>
        <Link href="/spaces" className="lift-hero__btn lift-hero__btn--lime">
          Площадки
        </Link>
      </div>
    );
  }

  return (
    <div className="event-list">
      {!hideTitle ? (
        <div className="event-list-head">
          <h2>Афиша мероприятий</h2>
        </div>
      ) : null}
      <div className="event-grid">
        {paged.items.map((e, i) => (
          <article key={e.id} className="glass event-card yp-feed-card">
            <div className="event-card-cover">
              <EntityCoverImage
                src={e.space?.image || '/covers/photo/sochi-sea.jpg'}
                alt={e.title}
                fallback="/covers/photo/sochi-sea.jpg"
                className="catalog-img"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="event-card-body">
              <h3 className="event-card-title">{e.title}</h3>
              <p className="event-card-desc">{e.space?.title}</p>
              <JoinEventButton
                eventId={e.id}
                initialIsJoined={Boolean(e.joinedByMe)}
                initialIsFull={false}
                initialAvailableSeats={99}
                title={e.title}
                startTime={e.startTime}
                endTime={e.endTime}
                location={[e.space?.title, e.space?.address].filter(Boolean).join(', ')}
                description={e.description}
                compact
              />
            </div>
          </article>
        ))}
      </div>
      <CatalogPagination page={page} totalPages={paged.pages} basePath="/events" />
    </div>
  );
}
