'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import GalleryLightbox, { type LightboxSlide } from '@/components/GalleryLightbox';

export type GallerySlide = LightboxSlide;

type Props = {
  images?: string[];
  items?: GallerySlide[];
  hideTitle?: boolean;
  mosaic?: boolean;
};

function isUsableSrc(src: string) {
  const u = String(src || '').trim();
  if (!u || u === '/' || u === '#' || /^javascript:/i.test(u) || u.startsWith('data:')) return false;
  return u.startsWith('/') || /^https?:\/\//i.test(u);
}

export default function PhotoGallery({ images, items, hideTitle = false, mosaic = false }: Props) {
  const slides: GallerySlide[] = (items?.length ? items : (images || []).map((url) => ({ url }))).filter((s) =>
    isUsableSrc(s.url)
  );

  const [index, setIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState<Record<string, true>>({});
  const list = slides.filter((s) => !failed[s.url]);

  if (list.length === 0) return null;

  return (
    <div style={{ marginTop: hideTitle ? 0 : '2rem' }}>
      {!hideTitle ? (
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Галерея</h3>
      ) : null}
      <div className={mosaic ? 'yp-gallery-mosaic is-home' : 'gallery-container yp-gallery-strip'}>
        {list.map((slide, idx) => (
          <button
            type="button"
            key={`${slide.url}-${idx}`}
            onClick={() => setIndex(idx)}
            className={mosaic ? `yp-gallery-tile${idx % 6 === 0 ? ' is-hero' : ''}` : 'gallery-thumb'}
          >
            <Image
              src={slide.url}
              alt={slide.caption || ''}
              fill
              sizes={mosaic ? '(max-width: 640px) 50vw, 280px' : '250px'}
              style={{ objectFit: 'cover' }}
              onError={() => setFailed((prev) => ({ ...prev, [slide.url]: true }))}
            />
            {slide.caption ? <span className="gallery-thumb__cap">{slide.caption}</span> : null}
          </button>
        ))}
      </div>

      {index != null && list[index] ? (
        <GalleryLightbox items={list} index={index} onClose={() => setIndex(null)} onIndex={setIndex} />
      ) : null}
    </div>
  );
}
