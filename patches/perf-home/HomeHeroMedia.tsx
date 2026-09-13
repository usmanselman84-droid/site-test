'use client';

import { useEffect, useState } from 'react';
import { preferStillHeroVideo } from '@/lib/prefer-lite-motion';

function rasterPoster(src: string) {
  return Boolean(src) && !/\.svg(\?|#|$)/i.test(src);
}

function mobileArtDirection(src: string) {
  if (!src) return '';
  if (src.includes('sochi-sea') && !src.includes('sochi-sea-mobile')) {
    return src.replace(/sochi-sea(\.[a-z0-9]+)/i, 'sochi-sea-mobile$1');
  }
  return '';
}

function webpTwin(src: string) {
  return src.replace(/\.(jpe?g|png)(\?.*)?$/i, '.webp$2');
}

/** Exactly one layer: photo OR video (never both competing). Static files — no /_next/image. */
export default function HomeHeroMedia({
  poster,
  video,
  wantVideo,
}: {
  poster: string;
  video: string;
  wantVideo: boolean;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [allowMotionVideo, setAllowMotionVideo] = useState(false);

  useEffect(() => {
    setAllowMotionVideo(!preferStillHeroVideo());
  }, []);

  const showVideo = wantVideo && Boolean(video) && !videoFailed && allowMotionVideo;
  const mobilePoster = mobileArtDirection(poster);

  return (
    <div className="svc-hero__media">
      {showVideo ? (
        <video
          className="svc-hero__video"
          src={video}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      ) : rasterPoster(poster) ? (
        <picture className="svc-hero__picture">
          {mobilePoster ? (
            <>
              <source media="(max-width: 768px)" type="image/webp" srcSet={webpTwin(mobilePoster)} />
              <source media="(max-width: 768px)" srcSet={mobilePoster} />
            </>
          ) : null}
          <source type="image/webp" srcSet={webpTwin(poster)} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="svc-hero__img"
            src={poster}
            alt=""
            width={1600}
            height={900}
            decoding="async"
            fetchPriority="high"
          />
        </picture>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="svc-hero__img"
          src={poster}
          alt=""
          width={1600}
          height={900}
          decoding="async"
          fetchPriority="high"
        />
      )}
    </div>
  );
}
