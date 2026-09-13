'use client';

import { useState } from 'react';
import Image from 'next/image';
import { resolveEntityCover, DEFAULT_SECTION_COVER } from '@/lib/theme-covers';

type Props = {
  src?: string | null;
  alt: string;
  fallback?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

const PLACEHOLDER = '/brand/covers/ink-lime.svg';

/** Catalog / event cover with SVG-safe loading and thematic fallback. */
export default function EntityCoverImage({
  src,
  alt,
  fallback,
  sizes,
  className,
  priority,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const thematic = fallback || DEFAULT_SECTION_COVER || PLACEHOLDER;
  const url = failed ? resolveEntityCover(null, thematic) : resolveEntityCover(src, thematic);
  const isSvg = /\.svg($|\?)/i.test(url);

  return (
    <>
      {!ready ? <span className="yp-cover-skeleton" aria-hidden /> : null}
      <Image
        src={url || PLACEHOLDER}
        alt={alt}
        fill
        style={{ objectFit: 'cover', opacity: ready ? 1 : 0 }}
        className={className}
        sizes={sizes || '(max-width: 640px) 100vw, 50vw'}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onLoad={() => setReady(true)}
        onError={() => {
          setFailed(true);
          setReady(true);
        }}
        unoptimized={isSvg || /^\/(covers|brand|icons|media)\//.test(url || '')}
        quality={60}
      />
    </>
  );
}
