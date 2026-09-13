'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import SocialAuthButtons, { writeSsoBindCookie, type SocialAuthFlags } from '@/components/SocialAuthButtons';
import { SSO_LABELS, type SsoProviderId } from '@/lib/sso-shared';

const CALLBACK = '/dashboard/settings?section=sso&sso=linked';

export default function LinkedAccountsPanel() {
  const searchParams = useSearchParams();
  const [linked, setLinked] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [available, setAvailable] = useState<SocialAuthFlags>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [bindToken, setBindToken] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/user/sso', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) return;
    const d = await r.json();
    setLinked(Array.isArray(d.linked) ? d.linked : []);
    setHasPassword(Boolean(d.hasPassword));
    setBindToken(typeof d.bindToken === 'string' ? d.bindToken : '');
    setAvailable({
      yandex: Boolean(d.available?.yandex),
      vk: Boolean(d.available?.vk),
      telegram: Boolean(d.available?.telegram),
      telegramBot: d.available?.telegramBot || '',
      esia: Boolean(d.available?.esia),
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const err = searchParams.get('error');
    if (err) toast.error(err);
    if (searchParams.get('sso') === 'linked') toast.success('Соцсеть привязана к этому профилю');
  }, [searchParams]);

  const unlink = async (provider: SsoProviderId) => {
    if (!confirm(`Отвязать ${SSO_LABELS[provider]} от этого аккаунта?`)) return;
    setBusy(provider);
    try {
      const r = await fetch('/api/user/sso', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Не удалось отвязать');
      toast.success('Отвязано');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(null);
    }
  };

  const toBind: SocialAuthFlags = {
    yandex: Boolean(available.yandex) && !linked.includes('yandex'),
    vk: Boolean(available.vk) && !linked.includes('vk'),
    telegram: Boolean(available.telegram) && !linked.includes('telegram'),
    telegramBot: available.telegramBot,
    esia: Boolean(available.esia) && !linked.includes('esia'),
  };

  return (
    <section className="card-surface" style={{ padding: '1rem 1.05rem', display: 'grid', gap: '0.85rem' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Один профиль — все соцсети</h2>
        <ol style={{ margin: '0.55rem 0 0', paddingLeft: '1.15rem', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>
          <li>Войдите в профиль, который оставляете (лучше с паролем).</li>
          <li>Нажмите «Привязать» у каждой сети — Яндекс, VK, Госуслуги, Telegram.</li>
          <li>Если сеть раньше открывала «другой» кабинет, она переедет сюда. Второй пустой профиль можно не использовать.</li>
        </ol>
        <p style={{ margin: '0.45rem 0 0', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.45 }}>
          Не жмите соцсеть на странице «Вход», пока хотите склеить аккаунты — там открывается уже связанный профиль.
          «Мессенджеры» — это боты, не вход.
        </p>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {(['yandex', 'vk', 'telegram', 'esia'] as SsoProviderId[]).map((id) => {
          const on = linked.includes(id);
          const enabled =
            id === 'yandex'
              ? available.yandex
              : id === 'vk'
                ? available.vk
                : id === 'telegram'
                  ? available.telegram
                  : available.esia;
          return (
            <li
              key={id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
                padding: '0.55rem 0.7rem',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.04)',
                fontSize: '0.9rem',
              }}
            >
              <span>
                <strong>{SSO_LABELS[id]}</strong>
                <span style={{ color: 'var(--muted)' }}>
                  {on ? ' · привязан' : enabled ? ' · не привязан' : ' · оператор не включил'}
                </span>
              </span>
              {on ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 36, padding: '0.3rem 0.7rem' }}
                  disabled={busy === id}
                  onClick={() => void unlink(id)}
                >
                  Отвязать
                </button>
              ) : id !== 'telegram' && enabled ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 36, padding: '0.3rem 0.7rem' }}
                  onClick={() => {
                    if (bindToken) writeSsoBindCookie(bindToken);
                    void signIn(id, { callbackUrl: CALLBACK });
                  }}
                >
                  Привязать
                </button>
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{enabled ? 'ниже' : '—'}</span>
              )}
            </li>
          );
        })}
      </ul>

      {toBind.telegram ? (
        <div>
          <p style={{ margin: '0 0 0.45rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
            Telegram: нажмите официальную кнопку — аккаунт привяжется к текущему профилю.
          </p>
          <SocialAuthButtons
            oauth={{ telegram: true, telegramBot: toBind.telegramBot }}
            callbackUrl={CALLBACK}
            bindToken={bindToken}
          />
        </div>
      ) : null}

      {!hasPassword ? (
        <p className="yp-sso-password-hint" style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '0.7rem 0.85rem' }}>
          Вы вошли через соцсеть, пароль ещё не задан. Кабинет открыт. Пожалуйста, установите пароль для дополнительной защиты — в разделе «Пароль» на этой странице.
        </p>
      ) : null}
    </section>
  );
}
