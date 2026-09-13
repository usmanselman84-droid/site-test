'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { safeCallbackUrl } from '@/lib/safe-callback-url';
import { useSafeSearchParams } from '@/lib/use-safe-search-params';
import { writeSsoBindCookie } from '@/components/SocialAuthButtons';

function parseTelegramPayload(): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const encoded = hash.get('tgAuthResult') || search.get('tgAuthResult');
  if (encoded) {
    try {
      const json = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
      if (json && typeof json === 'object') return json as Record<string, string>;
    } catch {
      /* ignore */
    }
  }
  const hashVal = search.get('hash') || hash.get('hash');
  if (!hashVal) return null;
  const out: Record<string, string> = {};
  for (const src of [search, hash]) {
    src.forEach((v, k) => {
      if (k !== 'callbackUrl' && v) out[k] = v;
    });
  }
  return out.hash ? out : null;
}

export default function TelegramLoginCallbackPage() {
  const searchParams = useSafeSearchParams();
  const [error, setError] = useState('');
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'), '/dashboard');

  useEffect(() => {
    const payload = parseTelegramPayload();
    if (!payload) {
      setError('Telegram не вернул данные входа. Попробуйте ещё раз.');
      return;
    }
    const bind = document.cookie.split('; ').find((c) => c.startsWith('yp-sso-bind='));
    if (bind) writeSsoBindCookie(bind.slice('yp-sso-bind='.length));
    void signIn('telegram', {
      redirect: true,
      callbackUrl,
      payload: JSON.stringify(payload),
    }).catch(() => setError('Не удалось войти через Telegram.'));
  }, [callbackUrl]);

  return (
    <main className="yp-auth-card" style={{ margin: '4rem auto', maxWidth: '24rem', textAlign: 'center' }}>
      <p>{error || 'Входим через Telegram…'}</p>
      {error ? (
        <p>
          <a href="/login">Вернуться ко входу</a>
        </p>
      ) : null}
    </main>
  );
}
