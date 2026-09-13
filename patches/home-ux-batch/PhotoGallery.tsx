'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type GallerySlide = { url: string; caption?: string };

type Props = {
  images?: string[];
  items?: GallerySlide[];
  hideTitle?: boolean;
};

function isUsableSrc(src: string) {
  const u = String(src || '').trim();
  if (!u || u === '/' || u === '#' || /^javascript:/i.test(u) || u.startsWith('data:')) return false;
  return u.startsWith('/') || /^https?:\/\//i.test(u);
}

export default function PhotoGallery({ images, items, hideTitle = false }: Props) {
  const slides: GallerySlide[] = (items?.length
    ? items
    : (images || []).map((url) => ({ url }))
  ).filter((s) => isUsableSrc(s.url));

  const [index, setIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, true>>({});
  const list = slides.filter((s) => !failed[s.url]);
  const current = index !== null ? list[index] : null;

  const close = () => setIndex(null);
  const go = useCallback(
    (dir: number) => {
      setIndex((i) => {
        if (i === null || list.length === 0) return i;
        return (i + dir + list.length) % list.length;
      });
    },
    [list.length]
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go]);

  if (list.length === 0) return null;

  return (
    <div style={{ marginTop: hideTitle ? 0 : '2rem' }}>
      {!hideTitle ? (
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Галерея</h3>
      ) : null}
      <div
        className="gallery-container"
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '1rem',
          paddingBottom: '1rem',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {list.map((slide, idx) => (
          <button
            type="button"
            key={`${slide.url}-${idx}`}
            onClick={() => setIndex(idx)}
            className="gallery-thumb"
            style={{
              flex: '0 0 80%',
              maxWidth: '250px',
              aspectRatio: '4/3',
              scrollSnapAlign: 'start',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              border: 0,
              padding: 0,
              background: '#0a0c2a',
            }}
          >
            <Image
              src={slide.url}
              alt={slide.caption || ''}
              fill
              sizes="250px"
              style={{ objectFit: 'cover' }}
              onError={() => setFailed((prev) => ({ ...prev, [slide.url]: true }))}
            />
            {slide.caption ? (
              <span className="gallery-thumb__cap">{slide.caption}</span>
            ) : null}
          </button>
        ))}
      </div>

      {current ? (
        <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={current.caption || 'Фото'}>
          <button type="button" className="gallery-lightbox__back" aria-label="Закрыть" onClick={close} />
          {list.length > 1 ? (
            <button type="button" className="gallery-lightbox__nav is-prev" aria-label="Назад" onClick={() => go(-1)}>
              <ChevronLeft size={22} />
            </button>
          ) : null}
          {list.length > 1 ? (
            <button type="button" className="gallery-lightbox__nav is-next" aria-label="Дальше" onClick={() => go(1)}>
              <ChevronRight size={22} />
            </button>
          ) : null}
          <button type="button" className="gallery-lightbox__close" onClick={close} aria-label="Закрыть">
            <X size={22} />
          </button>
          <figure className="gallery-lightbox__stage" onClick={(e) => e.stopPropagation()}>
            <Image
              src={current.url}
              alt={current.caption || ''}
              width={1600}
              height={900}
              sizes="90vw"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: 'min(78vh, 900px)', objectFit: 'contain' }}
            />
            <figcaption>
              <strong>{current.caption || 'Сочи в кадре'}</strong>
              {list.length > 1 ? (
                <span>
                  {index! + 1} / {list.length} · листайте стрелками или кнопками
                </span>
              ) : null}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </div>
  );
}
