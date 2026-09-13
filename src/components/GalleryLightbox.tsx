'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type LightboxSlide = { url: string; caption?: string };

type Props = {
  items: LightboxSlide[];
  index: number;
  onClose: () => void;
  onIndex: (next: number) => void;
};

export default function GalleryLightbox({ items, index, onClose, onIndex }: Props) {
  const startX = useRef<number | null>(null);
  const current = items[index];

  const go = useCallback(
    (dir: number) => {
      if (items.length < 2) return;
      onIndex((index + dir + items.length) % items.length);
    },
    [index, items.length, onIndex]
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  if (!current) return null;

  return (
    <div
      className="yp-glightbox"
      role="dialog"
      aria-modal="true"
      aria-label={current.caption || 'Просмотр фото'}
      onClick={onClose}
    >
      <button type="button" className="yp-glightbox__scrim" aria-label="Закрыть" onClick={onClose} />
      {items.length > 1 ? (
        <button
          type="button"
          className="yp-glightbox__nav is-prev"
          aria-label="Назад"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          <ChevronLeft size={22} />
        </button>
      ) : null}
      {items.length > 1 ? (
        <button
          type="button"
          className="yp-glightbox__nav is-next"
          aria-label="Дальше"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          <ChevronRight size={22} />
        </button>
      ) : null}
      <button
        type="button"
        className="yp-glightbox__close"
        onClick={onClose}
        aria-label="Закрыть"
      >
        <X size={22} />
      </button>
      <figure
        className="yp-glightbox__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startX.current = e.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const x = e.changedTouches[0]?.clientX;
          if (startX.current == null || x == null) return;
          const dx = x - startX.current;
          if (dx > 48) go(-1);
          if (dx < -48) go(1);
          startX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.caption || ''} />
        <figcaption>
          <strong>{current.caption || 'Кадр портала'}</strong>
          {items.length > 1 ? (
            <span>
              {index + 1} / {items.length} · стрелки, свайп или кнопки
            </span>
          ) : null}
        </figcaption>
      </figure>
    </div>
  );
}
