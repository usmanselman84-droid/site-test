'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import SocialAuthButtons, { type SocialAuthFlags } from '@/components/SocialAuthButtons';
import { SSO_LABELS, type SsoProviderId } from '@/lib/sso-shared';

const CALLBACK = '/dashboard/settings?section=sso';

export default function LinkedAccountsPanel() {
  const [linked, setLinked] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [available, setAvailable] = useState<SocialAuthFlags>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/user/sso', { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) return;
    const d = await r.json();
    setLinked(Array.isArray(d.linked) ? d.linked : []);
    setHasPassword(Boolean(d.hasPassword));
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
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>Вход через соцсети</h2>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.45 }}>
          Можно держать на одном профиле сразу Яндекс, VK, Telegram и Госуслуги — если оператор их включил.
          Привязывайте <strong>из этого экрана, уже войдя</strong>. Если нажать ту же кнопку на странице «Вход» без
          сессии, может создаться второй аккаунт (особенно у Telegram, у него часто нет почты).
        </p>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.45 }}>
          Раздел «Мессенджеры» — это уведомления от ботов, не вход на сайт.
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
                  onClick={() => void signIn(id, { callbackUrl: CALLBACK })}
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
          <SocialAuthButtons oauth={{ telegram: true, telegramBot: toBind.telegramBot }} callbackUrl={CALLBACK} />
        </div>
      ) : null}

      {!hasPassword ? (
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#b45309' }}>
          Пароль не задан. Оставьте хотя бы один способ входа или задайте пароль в разделе «Пароль», прежде чем отвязывать соцсети.
        </p>
      ) : null}
    </section>
  );
}
