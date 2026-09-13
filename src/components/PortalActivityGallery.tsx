'use client';

import { useMemo, useState } from 'react';
import type { GalleryItem } from '@/lib/gallery-shared';
import GalleryLightbox from '@/components/GalleryLightbox';

type Props = { items: GalleryItem[] };

type DayGroup = { key: string; label: string; items: GalleryItem[] };

function dayKey(iso?: string, fallbackIdx = 0): string {
  if (!iso) return `unknown-${fallbackIdx}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `unknown-${fallbackIdx}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(key: string): string {
  if (key.startsWith('unknown')) return 'Без даты';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startThat = new Date(y, m - 1, d);
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function monthKey(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function groupByDay(items: GalleryItem[]): DayGroup[] {
  const map = new Map<string, GalleryItem[]>();
  items.forEach((item, idx) => {
    const key = dayKey(item.createdAt, idx);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  });
  const keys = [...map.keys()].sort((a, b) => {
    if (a.startsWith('unknown') && b.startsWith('unknown')) return 0;
    if (a.startsWith('unknown')) return 1;
    if (b.startsWith('unknown')) return -1;
    return b.localeCompare(a);
  });
  return keys.map((key) => ({ key, label: dayLabel(key), items: map.get(key) || [] }));
}

export default function PortalActivityGallery({ items }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const [month, setMonth] = useState('all');
  const [layout, setLayout] = useState<'mosaic' | 'feed'>('mosaic');

  const months = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      const k = monthKey(i.createdAt);
      if (k) set.add(k);
    });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [items]);

  const visible = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    if (month === 'all') return sorted;
    return sorted.filter((i) => monthKey(i.createdAt) === month);
  }, [items, month]);

  const groups = useMemo(() => groupByDay(visible), [visible]);
  const flat = visible;

  if (!items.length) return null;

  return (
    <>
      <div className="yp-gallery-toolbar">
        <div className="yp-gallery-chips" role="tablist" aria-label="Месяц">
          <button
            type="button"
            className={`yp-gallery-chip${month === 'all' ? ' is-on' : ''}`}
            onClick={() => setMonth('all')}
          >
            Все {items.length}
          </button>
          {months.map((m) => (
            <button
              key={m}
              type="button"
              className={`yp-gallery-chip${month === m ? ' is-on' : ''}`}
              onClick={() => setMonth(m)}
            >
              {monthLabel(m)}
            </button>
          ))}
        </div>
        <div className="yp-gallery-layouts">
          <button
            type="button"
            className={`yp-gallery-chip${layout === 'mosaic' ? ' is-on' : ''}`}
            onClick={() => setLayout('mosaic')}
          >
            Мозаика
          </button>
          <button
            type="button"
            className={`yp-gallery-chip${layout === 'feed' ? ' is-on' : ''}`}
            onClick={() => setLayout('feed')}
          >
            По дням
          </button>
        </div>
      </div>

      {layout === 'mosaic' ? (
        <div className="yp-gallery-mosaic">
          {flat.map((item, idx) => (
            <button
              key={`${item.url}-${idx}`}
              type="button"
              className={`yp-gallery-tile${idx % 7 === 0 ? ' is-hero' : idx % 5 === 0 ? ' is-tall' : ''}`}
              onClick={() => setOpen(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.caption || `Кадр ${idx + 1}`} loading="lazy" decoding="async" />
              {item.caption ? <span className="yp-gallery-tile__cap">{item.caption}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="portal-activity-by-day">
          {groups.map((group) => (
            <section key={group.key} className="portal-activity-day">
              <header className="portal-activity-day__head">
                <h2 className="portal-activity-day__title">{group.label}</h2>
                <span className="portal-activity-day__count">{group.items.length} фото</span>
              </header>
              <div className="yp-gallery-mosaic is-compact">
                {group.items.map((item) => {
                  const idx = flat.findIndex((x) => x.url === item.url && x.createdAt === item.createdAt);
                  return (
                    <button
                      key={`${item.url}-${group.key}`}
                      type="button"
                      className="yp-gallery-tile"
                      onClick={() => setOpen(idx < 0 ? 0 : idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt={item.caption || ''} loading="lazy" decoding="async" />
                      {item.caption ? <span className="yp-gallery-tile__cap">{item.caption}</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {open != null && flat[open] ? (
        <GalleryLightbox items={flat} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
      ) : null}
    </>
  );
}
