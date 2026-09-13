'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function SearchLiveForm({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const lastSent = useRef(initialQuery.trim());

  useEffect(() => {
    setValue(initialQuery);
    lastSent.current = initialQuery.trim();
  }, [initialQuery]);

  useEffect(() => {
    const q = value.trim();
    const t = window.setTimeout(() => {
      if (q === lastSent.current) return;
      lastSent.current = q;
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    }, 280);
    return () => window.clearTimeout(t);
  }, [value, router]);

  return (
    <form
      action="/search"
      method="GET"
      className="search-page__form"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        lastSent.current = q;
        router.replace(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
      }}
    >
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="search-page__input"
        placeholder="Начните вводить — результаты появятся сами"
        autoFocus
        autoComplete="off"
        aria-label="Поисковый запрос"
      />
    </form>
  );
}
