'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSafeSearchParams } from '@/lib/use-safe-search-params';
import { MapPin } from 'lucide-react';
import EntityCoverImage from '@/components/EntityCoverImage';
import GuestAuthPrompt from '@/components/GuestAuthPrompt';
import SpaceFilterBar from '@/components/SpaceFilterBar';
import {
  SPACE_CATEGORIES,
  parseSpaceAmenities,
} from '@/lib/spaces';
import { encodeRouteParam } from '@/lib/route-id';
import { spaceCover } from '@/lib/theme-covers';
import CatalogPagination from '@/components/CatalogPagination';
import { CATALOG_PAGE_SIZE, catalogSlice, totalPages } from '@/lib/pagination';
import type { PublicSpaceCard } from '@/lib/public-catalogs';
import { isCoworkingSpace, isHallBookable } from '@/lib/coworking';
import { ruCount } from '@/lib/catalog-query';

export default function SpacesCatalogClient({ items }: { items: PublicSpaceCard[] }) {
  const sp = useSafeSearchParams();
  const query = (sp.get('q') || '').trim().toLowerCase();
  const statusFilter = sp.get('status') || 'ALL';
  const categoryFilter = (sp.get('category') || '').trim();
  const amenityFilter = (sp.get('amenity') || '').trim();
  const page = catalogSlice(sp.get('page') || '1').page;

  const filtered = useMemo(() => {
    let list = items.slice();
    if (query) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          String(s.address || '').toLowerCase().includes(query) ||
          String(s.description || '').toLowerCase().includes(query) ||
          String(s.category || '').toLowerCase().includes(query) ||
          String(s.pitch || '').toLowerCase().includes(query) ||
          String(s.who || '').toLowerCase().includes(query)
      );
    }
    if (statusFilter !== 'ALL') list = list.filter((s) => s.status === statusFilter);
    if (categoryFilter && categoryFilter !== 'ALL') list = list.filter((s) => s.category === categoryFilter);
    if (amenityFilter && amenityFilter !== 'ALL') {
      list = list.filter((s) => parseSpaceAmenities(s.amenities).includes(amenityFilter as never));
    }
    return list;
  }, [items, query, statusFilter, categoryFilter, amenityFilter]);

  const total = filtered.length;
  const { skip, take } = catalogSlice(page);
  const spaces = filtered.slice(skip, skip + take);
  const pages = totalPages(total, CATALOG_PAGE_SIZE);
  const listQuery = { q: query || undefined, category: categoryFilter || undefined };
  const usedCategories = Array.from(new Set([...SPACE_CATEGORIES, ...items.map((s) => s.category).filter(Boolean)])) as string[];

  return (
    <div className="container catalog-page">
      <div className="catalog-page-header">
        <div className="catalog-page-header__intro">
          <h1 className="page-hero-title">Молодёжные пространства</h1>
          <p className="catalog-page-header__lead">
            Площадки ЦРМ для встреч, залов и событий. Это не гид по городу — пляжи и парки в разделе{' '}
            <Link href="/places">Куда сходить</Link>. Нужен стол на час —{' '}
            <Link href="/coworking">запись в коворкинг</Link>.
          </p>
          <p className="catalog-page-header__count">
            {total ? ruCount(total, 'площадка', 'площадки', 'площадок') : 'Каталог площадок'}
          </p>
          <div className="catalog-page-header__links" aria-label="Связанные разделы">
            <Link href="/coworking" className="btn btn-primary">
              Запись в коворкинг
            </Link>
            <Link href="/places" className="btn btn-secondary">
              Куда сходить
            </Link>
          </div>
        </div>
        <div className="catalog-page-header__search">
          <SpaceFilterBar placeholder="Поиск пространств…" categories={usedCategories} />
        </div>
      </div>

      {spaces.length === 0 ? (
        <div className="svc-empty">
          <h3>{items.length === 0 ? 'Каталог временно недоступен' : 'Ничего не найдено'}</h3>
          <p>
            {items.length === 0
              ? 'Обновите страницу или попробуйте позже.'
              : 'Смените категорию или поисковый запрос.'}
          </p>
          {items.length === 0 ? (
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Повторить
            </button>
          ) : (
            <Link href="/spaces" className="btn btn-primary">
              Сбросить фильтры
            </Link>
          )}
        </div>
      ) : (
        <div className="svc-space-grid">
          {spaces.map((space, idx) => {
            const coworking = isCoworkingSpace(space);
            const hall = isHallBookable(space);
            const statusLine =
              space.status === 'COMPLETED'
                ? 'площадка закрыта'
                : coworking && hall
                  ? `бронь и коворкинг · до ${space.capacity} мест`
                  : coworking
                    ? `коворкинг · до ${space.capacity} мест`
                    : (space.bookings?.length || 0) > 0
                      ? `событий рядом: ${space.bookings.length}`
                      : 'есть свободные слоты';
            const href = `/spaces/${encodeRouteParam(space.id)}`;

            return (
              <article key={space.id} className="svc-space-card yp-feed-card">
                <Link href={href} className="svc-space-card__photo yp-feed-card__media" aria-label={space.title}>
                  <EntityCoverImage
                    src={spaceCover(space, skip + idx)}
                    alt={space.title}
                    fallback={spaceCover(space, skip + idx + 5)}
                    className="svc-space-card__img"
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                </Link>
                <div className="svc-space-card__body">
                  <span className="svc-space-card__badge">
                    {coworking && hall
                      ? 'Бронь и коворкинг'
                      : space.category || (coworking ? 'Коворкинг' : 'Зал')}
                  </span>
                  <h3>
                    <Link href={href}>{space.title}</Link>
                  </h3>
                  <p className="svc-space-card__addr">
                    <MapPin size={14} aria-hidden />
                    <span>{space.address || 'Сочи'}</span>
                  </p>
                  {space.pitch ? <p className="svc-space-card__why">{space.pitch}</p> : null}
                  {space.who && space.who !== space.pitch ? (
                    <p className="svc-space-card__who">Кому: {space.who}</p>
                  ) : null}
                  <p className={`svc-space-card__status${coworking ? ' is-cowork' : ''}`}>{statusLine}</p>
                  {space.status !== 'COMPLETED' ? (
                    <div className={`svc-space-card__cta-row${coworking && hall ? ' is-dual' : ''}`}>
                      {hall ? (
                        <GuestAuthPrompt
                          href={`${href}/book?from=list`}
                          className="btn btn-primary"
                          asButton
                        >
                          Расписание
                        </GuestAuthPrompt>
                      ) : null}
                      {coworking ? (
                        <GuestAuthPrompt
                          href={`/coworking?space=${encodeURIComponent(space.id)}`}
                          className="btn btn-secondary"
                          asButton
                        >
                          Коворкинг
                        </GuestAuthPrompt>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <CatalogPagination page={page} totalPages={pages} basePath="/spaces" query={listQuery} />
    </div>
  );
}
