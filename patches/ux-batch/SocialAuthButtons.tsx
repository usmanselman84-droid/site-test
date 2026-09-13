'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export type SocialAuthFlags = {
  vk?: boolean;
  yandex?: boolean;
  telegram?: boolean;
  telegramBot?: string;
  esia?: boolean;
};

const DISCLAIMER =
  'Авторизуясь, вы подтверждаете, что вам исполнилось 14 лет, и соглашаетесь с Политикой конфиденциальности';

export function writeSsoBindCookie(token: string) {
  if (!token || typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `yp-sso-bind=${token}; Path=/; Max-Age=600; SameSite=Lax${secure}`;
}

/** Official-style Yandex ID mark: red tile + «Я», not the distorted wordmark. */
function YandexMark() {
  return (
    <svg className="yp-sso__mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#FC3F1D" />
      <path
        fill="#fff"
        d="M13.05 4.7h-1.95c-2.48 0-4.05 1.35-4.05 3.48 0 1.58.78 2.64 2.38 3.26L6.6 19.3h2.48l2.38-6.7h1.42v6.7h2.22V4.7h-2.05zm-1.95 5.72c-1.18-.36-1.72-1.05-1.72-2.16 0-1.3.88-2.05 2.35-2.05h1.32v4.21h-1.95z"
      />
    </svg>
  );
}

function VkMark() {
  return (
    <svg className="yp-sso__mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0077FF" />
      <path
        fill="#fff"
        d="M12.95 17.15c-4.7 0-7.35-3.2-7.45-8.5h2.35c.08 3.95 1.82 5.55 3.2 5.92V8.65h2.25v3.4c1.35-.14 2.7-1.7 3.15-3.4h2.25c-.35 2-1.9 3.5-3 4.15 1.1.55 2.8 1.9 3.45 4.35h-2.45c-.55-1.7-1.9-2.95-3.6-3.15v3.15h-.1Z"
      />
    </svg>
  );
}

export default function SocialAuthButtons({
  oauth,
  callbackUrl,
  showEsia = false,
  bindToken,
}: {
  oauth: SocialAuthFlags;
  callbackUrl: string;
  showEsia?: boolean;
  /** When set, OAuth attaches to this logged-in profile instead of opening a duplicate. */
  bindToken?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const hasVk = Boolean(oauth.vk);
  const hasYandex = Boolean(oauth.yandex);
  const hasTg = Boolean(oauth.telegram && oauth.telegramBot);
  const hasEsia = Boolean(showEsia && oauth.esia);
  const hasAny = hasVk || hasYandex || hasTg || hasEsia;

  useEffect(() => {
    if (!hasTg || !oauth.telegramBot || !hostRef.current) return;
    const host = hostRef.current;
    host.innerHTML = '';
    (window as unknown as { TelegramLoginWidget?: { dataOnauth?: (u: Record<string, string>) => void } }).TelegramLoginWidget =
      {
        dataOnauth: (user) => {
          if (bindToken) writeSsoBindCookie(bindToken);
          void signIn('telegram', {
            redirect: true,
            callbackUrl,
            payload: JSON.stringify(user),
          });
        },
      };
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', oauth.telegramBot.replace(/^@/, ''));
    script.setAttribute('data-size', 'medium');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    host.appendChild(script);
    return () => {
      host.innerHTML = '';
    };
  }, [hasTg, oauth.telegramBot, callbackUrl, bindToken]);

  if (!hasAny) return null;

  return (
    <div className="yp-sso">
      <p className="yp-sso__or">или войти через соцсеть</p>
      <div className="yp-sso__grid yp-sso__grid--icons">
        {hasYandex ? (
          <button
            type="button"
            className="yp-sso__icon-btn"
            onClick={() => {
              if (bindToken) writeSsoBindCookie(bindToken);
              void signIn('yandex', { callbackUrl });
            }}
            aria-label="Войти через Яндекс"
          >
            <YandexMark />
            <span>Яндекс</span>
          </button>
        ) : null}
        {hasVk ? (
          <button
            type="button"
            className="yp-sso__icon-btn"
            onClick={() => {
              if (bindToken) writeSsoBindCookie(bindToken);
              void signIn('vk', { callbackUrl });
            }}
            aria-label="Войти через VK"
          >
            <VkMark />
            <span>VK</span>
          </button>
        ) : null}
        {hasTg ? <div ref={hostRef} className="yp-sso__tg" /> : null}
        {hasEsia ? (
          <button
            type="button"
            className="yp-sso__icon-btn"
            onClick={() => {
              if (bindToken) writeSsoBindCookie(bindToken);
              void signIn('esia', { callbackUrl });
            }}
            aria-label="Войти через Госуслуги"
          >
            <span>Госуслуги</span>
          </button>
        ) : null}
      </div>
      <p className="yp-sso__legal">
        {DISCLAIMER}{' '}
        <Link href="/privacy" target="_blank" rel="noreferrer">
          Политика
        </Link>
        {' · '}
        <Link href="/terms" target="_blank" rel="noreferrer">
          Соглашение
        </Link>
        .
      </p>
    </div>
  );
}
