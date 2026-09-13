'use client';

import { Children, useCallback, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  label: string;
  children: ReactNode;
};

/** Horizontal snap slides; mouse wheel and arrows move one card on desktop. */
export default function HomeSlideRail({ label, children }: Props) {
  const slides = Children.toArray(children).filter(Boolean);
  const railRef = useRef<HTMLDivElement>(null);

  const slideStep = useCallback(() => {
    const el = railRef.current;
    if (!el) return 0;
    const slide = el.querySelector<HTMLElement>('.home-rail__slide');
    const gap = parseFloat(getComputedStyle(el).gap || '12') || 12;
    return (slide?.offsetWidth || el.clientWidth * 0.8) + gap;
  }, []);

  const scrollBySlide = useCallback(
    (dir: -1 | 1) => {
      const el = railRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * slideStep(), behavior: 'smooth' });
    },
    [slideStep]
  );

  /* Vertical page scroll must not hijack into a one-card jump. */

  if (!slides.length) return null;

  const showNav = slides.length > 1;

  return (
    <div className="home-rail-wrap">
      {showNav ? (
        <button
          type="button"
          className="home-rail-nav home-rail-nav--prev"
          aria-label={`${label}: предыдущий слайд`}
          onClick={() => scrollBySlide(-1)}
        >
          <ChevronLeft size={28} strokeWidth={2.4} aria-hidden />
        </button>
      ) : null}
      <div
        ref={railRef}
        className="home-rail"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
      >
        {slides.map((slide, i) => (
          <div className="home-rail__slide" key={i}>
            {slide}
          </div>
        ))}
      </div>
      {showNav ? (
        <button
          type="button"
          className="home-rail-nav home-rail-nav--next"
          aria-label={`${label}: следующий слайд`}
          onClick={() => scrollBySlide(1)}
        >
          <ChevronRight size={28} strokeWidth={2.4} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
