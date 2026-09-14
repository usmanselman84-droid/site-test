'use client';

import { Children, isValidElement, useState, type ReactNode } from 'react';
import { EVENT_CATEGORIES } from '@/lib/event-meta';

export default function AfishaTagFilter({ children }: { children: ReactNode }) {
  const [tag, setTag] = useState('ALL');
  const tags = EVENT_CATEGORIES.filter((c) => c !== 'Общее' && c !== 'Другое');

  return (
    <>
      <div className="catalog-sticky-tags" role="tablist" aria-label="Категории афиши">
        <button type="button" className={tag === 'ALL' ? 'is-on' : ''} onClick={() => setTag('ALL')}>
          Все
        </button>
        {tags.map((c) => (
          <button key={c} type="button" className={tag === c ? 'is-on' : ''} onClick={() => setTag(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="event-grid">
        {Children.map(children, (child) => {
          if (!isValidElement<{ 'data-event-cat'?: string }>(child)) return child;
          const cat = child.props['data-event-cat'] || 'Общее';
          if (tag !== 'ALL' && cat !== tag) return null;
          return child;
        })}
      </div>
    </>
  );
}
