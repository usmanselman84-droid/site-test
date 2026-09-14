'use client';

import AuthHomeLink from '@/components/AuthHomeLink';
import AuthStage from '@/components/AuthStage';
import dynamic from 'next/dynamic';

const CaptchaField = dynamic(() => import('@/components/CaptchaField'), {
  ssr: false,
  loading: () => <p className="yp-auth-label">Проверка…</p>,
});

import { useState, useRef, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { safeCallbackUrl } from '@/lib/safe-callback-url';
import { useSafeSearchParams } from '@/lib/use-safe-search-params';
import SocialAuthButtons, { type SocialAuthFlags } from '@/components/SocialAuthButtons';

async function offerSavePassword(login: string, password: string, form?: HTMLFormElement | null) {
  try {
    if (typeof window === 'undefined' || !window.isSecureContext) return;
    if (!navigator.credentials || typeof navigator.credentials.store !== 'function') return;
    const PasswordCredentialCtor = (window as any).PasswordCredential;
    if (typeof PasswordCredentialCtor !== 'function') return;
    const cred = form
      ? new PasswordCredentialCtor(form)
      : new PasswordCredentialCtor({ id: login, name: login, password });
    await navigator.credentials.store(cred);
  } catch {
    /* ignore */
  }
}

function mapAuthError(rawIn: string, fallback: string) {
  let raw = rawIn;
  try {
    raw = decodeURIComponent(rawIn);
  } catch {
    /* keep */
  }
  if (!raw || raw === 'CredentialsSignin' || raw === 'undefined') {
    return fallback;
  }
  if (
    raw === 'OAuthAccountNotLinked' ||
    raw === 'OAuthCallback' ||
    raw === 'OAuthSignin' ||
    raw === 'OAuthCreateAccount' ||
    raw === 'Callback' ||
    raw === 'AccessDenied' ||
    raw === 'Configuration'
  ) {
    return 'Вход через соцсеть сейчас не сработал. Войдите email (или телефоном) и паролем. Если пароля нет — страница «Забыли пароль».';
  }
  return raw;
}

function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [captchaToken, setCaptchaToken] = useState('');
  const [oauth, setOauth] = useState<SocialAuthFlags>({});
  const [esiaOn, setEsiaOn] = useState(false);
  const [ssoAvailable, setSsoAvailable] = useState(true);
  const [authTicket, setAuthTicket] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [registrationOn, setRegistrationOn] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const searchParams = useSafeSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'), '/dashboard');
  const staffMode =
    searchParams.get('staff') === '1' ||
    callbackUrl.startsWith('/admin') ||
    callbackUrl.startsWith('/scanner') ||
    callbackUrl.startsWith('/ops');

  const role = session?.user?.role;
  const isStaffSession =
    role === 'ADMIN' || role === 'MODERATOR' || role === 'SCANNER' || role === 'TECH';

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setMaintenanceOn(Boolean(d?.maintenanceMode));
        const reg =
          d?.registrationEnabled !== false &&
          d?.modules?.registration !== false;
        setRegistrationOn(reg);
        setEsiaOn(Boolean(d?.esiaLoginEnabled));
        if (typeof d?.ssoAvailable === 'boolean') setSsoAvailable(d.ssoAvailable);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = async (loginValue: string, pwd: string) => {
    setError('');
    await offerSavePassword(loginValue, pwd, formRef.current);

    // Non-blocking: do not delay cabinet entry on slow mobile networks.
    void import('@/lib/device-fingerprint')
      .then((m) => m.pingSecurity('LOGIN'))
      .catch(() => undefined);

    let dest = callbackUrl;
    let nextRole: string | undefined;
    try {
      const sessionRes = await fetch('/api/auth/session');
      const nextSession = await sessionRes.json();
      nextRole = nextSession?.user?.role;
      const mustChange = Boolean(nextSession?.user?.mustChangePassword);
      if (nextRole === 'TECH') {
        dest = mustChange ? '/change-password?next=/ops' : '/ops';
      } else if (mustChange) {
        dest = '/change-password';
      } else if (nextRole === 'SCANNER') dest = '/scanner';
      else if (nextRole === 'ADMIN' || nextRole === 'MODERATOR') {
        const userSurface =
          callbackUrl.startsWith('/dashboard') ||
          callbackUrl.startsWith('/more') ||
          callbackUrl.startsWith('/tickets') ||
          callbackUrl.startsWith('/friends') ||
          callbackUrl.startsWith('/messages') ||
          callbackUrl.startsWith('/coworking') ||
          callbackUrl.startsWith('/spaces') ||
          callbackUrl.startsWith('/events') ||
          callbackUrl.startsWith('/u/');
        if (staffMode || !callbackUrl || callbackUrl === '/' || (!userSurface && !callbackUrl.startsWith('/admin'))) {
          dest = '/admin';
        }
      }
    } catch {
      /* keep */
    }

    const staffOk =
      nextRole === 'ADMIN' ||
      nextRole === 'MODERATOR' ||
      nextRole === 'SCANNER' ||
      nextRole === 'TECH';
    if (maintenanceOn && !staffOk) {
      setLoading(false);
      setError(
        staffMode
          ? 'Сейчас доступ только для сотрудников (админ / модератор / сканер / tech).'
          : 'Портал на обслуживании. Обычные аккаунты временно недоступны.'
      );
      window.location.assign('/maintenance');
      return;
    }

    window.location.assign(dest);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmed = login.trim();
    const loginValue = trimmed.toLowerCase();
    // Only trust a post-network session if this attempt could have created it
    // (guest → session). Never treat a pre-existing cookie as proof of success.
    const hadUserBeforeAttempt = Boolean(session?.user?.id);

    if (needs2fa && challengeToken) {
      if (!/^\d{6}$/.test(totpCode.trim())) {
        setLoading(false);
        setError('Введите 6-значный код из приложения');
        return;
      }
      let result: { error?: string | null; ok?: boolean; url?: string | null } | undefined;
      try {
        result = await signIn('credentials', {
          redirect: false,
          email: loginValue || '2fa',
          password: 'x',
          challengeToken,
          totpCode: totpCode.trim(),
        });
      } catch {
        if (!hadUserBeforeAttempt) {
          try {
            const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
            const nextSession = await sessionRes.json();
            if (nextSession?.user?.id && !nextSession?.error) {
              await finishLogin(loginValue, password);
              return;
            }
          } catch {
            /* fall through */
          }
        }
        setLoading(false);
        setError('Не удалось войти. Обновите страницу и попробуйте снова.');
        return;
      }
      if (result?.error) {
        setLoading(false);
        setError(mapAuthError(String(result.error), 'Неверный код 2FA'));
        return;
      }
      await finishLogin(loginValue, password);
      return;
    }

    if (!captchaToken) {
      setLoading(false);
      setError('Пройдите проверку «я не робот»');
      return;
    }

    // Detect 2FA before creating session (reliable vs NextAuth error stripping)
    let challengeOk = false;
    let ticket = authTicket;
    try {
      const chalRes = await fetch('/api/user/2fa/login-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginValue,
          password,
          requireCaptcha: '1',
          captchaToken,
          website: '',
        }),
      });
      const chal = await chalRes.json().catch(() => ({}));
      if (!chalRes.ok) {
        setLoading(false);
        setFailCount((n) => n + 1);
        setCaptchaToken('');
        setError(chal.message || 'Неверный email или пароль');
        return;
      }
      if (chal.needs2fa && chal.challengeToken) {
        setLoading(false);
        setNeeds2fa(true);
        setChallengeToken(String(chal.challengeToken));
        setTotpCode('');
        return;
      }
      if (chal.authTicket) {
        ticket = String(chal.authTicket);
        setAuthTicket(ticket);
      }
      challengeOk = true;
    } catch {
      /* fall through to normal signIn */
    }

    let result: { error?: string | null; ok?: boolean; url?: string | null } | undefined;
    try {
      result = await signIn('credentials', {
        redirect: false,
        email: loginValue,
        password,
        requireCaptcha: challengeOk ? '0' : '1',
        captchaToken: challengeOk ? '' : captchaToken,
        authTicket: challengeOk ? ticket : '',
        website: '',
      });
    } catch {
      // Network/ClientFetchError only — cookie may already be set after a 200.
      if (!hadUserBeforeAttempt) {
        try {
          const sessionRes = await fetch('/api/auth/session', { cache: 'no-store' });
          const nextSession = await sessionRes.json();
          if (nextSession?.user?.id && !nextSession?.error) {
            await finishLogin(loginValue, password);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      setLoading(false);
      setFailCount((n) => n + 1);
      setCaptchaToken('');
      setError('Не удалось войти. Обновите страницу и попробуйте снова.');
      return;
    }

    if (result?.error) {
      const decoded = mapAuthError(String(result.error), String(result.error));
      if (decoded.startsWith('NEEDS_2FA:')) {
        setLoading(false);
        setNeeds2fa(true);
        setChallengeToken(decoded.slice('NEEDS_2FA:'.length));
        setTotpCode('');
        setError('');
        return;
      }

      // Failed signIn must not enter the cabinet — even if an old session cookie exists.
      setLoading(false);
      setFailCount((n) => n + 1);
      setCaptchaToken('');
      setError(mapAuthError(String(result.error), 'Неверный email/телефон или пароль'));
      return;
    }

    await finishLogin(loginValue, password);
  };

  useEffect(() => {
    // NextAuth OAuth / redirect failures land as ?error= on /login (pages.signIn).
    // Copy once into React state and strip the query so a later successful attempt
    // cannot re-show a stale banner. Do not invent success by clearing on session.
    const qErr = searchParams.get('error');
    if (!qErr) return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('error')) {
        url.searchParams.delete('error');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch {
      /* ignore */
    }
    if (sessionStatus === 'authenticated') {
      // Already signed in: leftover query from an old redirect, not this attempt.
      return;
    }
    setError(mapAuthError(qErr, 'Неверный email или пароль'));
  }, [searchParams, sessionStatus]);

  useEffect(() => {
    const fromQuery = (searchParams.get('email') || '').trim();
    if (fromQuery) setLogin(fromQuery);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/public/status')
      .then((r) => r.json())
      .then((d) => {
                if (d.oauth) {
          setOauth({
            yandex: Boolean(d.oauth.yandex),
            vk: Boolean(d.oauth.vk),
            telegram: Boolean(d.oauth.telegram),
            telegramBot: d.oauth.telegramBot || '',
            telegramBotId: d.oauth.telegramBotId || '',
            esia: Boolean(d.oauth.esia),
          });
        }
        if (typeof d?.ssoAvailable === 'boolean') setSsoAvailable(d.ssoAvailable);
      })
      .catch(() => {
        setOauth({});
        setSsoAvailable(false);
      });
  }, []);

  return (
    <AuthStage style={{ minHeight: maintenanceOn ? '100svh' : undefined }}>
      <div className="yp-auth-card">
        <AuthHomeLink />
        <p className="yp-auth-brand">Молодёжь Сочи</p>
        <h1 className="yp-auth-title">
          {needs2fa
            ? 'Подтверждение входа'
            : staffMode || maintenanceOn
              ? 'Вход для сотрудников'
              : 'Вход'}
        </h1>
        {needs2fa ? (
          <p className="yp-auth-lead">Введите код из приложения-аутентификатора.</p>
        ) : (staffMode || maintenanceOn) && (
          <p className="yp-auth-lead">
            {maintenanceOn
              ? 'Сайт на обслуживании. Войти могут администраторы, модераторы и сканеры.'
              : 'Служебный вход в панель управления.'}
          </p>
        )}
        {!needs2fa && !staffMode && !maintenanceOn ? (
          <p className="yp-auth-lead">
            Основной вход — email или телефон и пароль. Соцсети — дополнительный способ, если сервис отвечает.
          </p>
        ) : null}

        {sessionStatus === 'authenticated' && maintenanceOn && !isStaffSession && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 12,
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.88rem',
              lineHeight: 1.45,
            }}
          >
            Сейчас вы вошли как обычный пользователь. Чтобы открыть панель, выйдите и войдите учётной записью
            сотрудника.
            <button
              type="button"
              className="btn btn-secondary"
              disabled={signingOut}
              style={{ width: '100%', marginTop: '0.75rem' }}
              onClick={async () => {
                setSigningOut(true);
                await signOut({ redirect: false });
                window.location.assign('/login?callbackUrl=%2Fadmin&staff=1');
              }}
            >
              {signingOut ? 'Выход…' : 'Выйти и войти как сотрудник'}
            </button>
          </div>
        )}

        {error ? (
          <div
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              color: 'var(--accent)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        ) : null}

        {!needs2fa && !ssoAvailable ? (
          <p className="yp-auth-alert yp-auth-alert--warn" style={{ marginBottom: '1rem' }}>
            Соцсети сейчас не отвечают. Войдите email или телефоном и паролем.{' '}
            <Link href="/forgot-password">Нет пароля — восстановить доступ</Link>
          </p>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!needs2fa ? (
            <>
              <div>
                <label className="yp-auth-label">Email или телефон</label>
                <input
                  type="text"
                  name="username"
                  inputMode="email"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setLogin(e.target.value);
                  }}
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity('Укажите email или телефон');
                  }}
                  required
                  className="yp-auth-input"
                  placeholder="email или +7…"
                />
              </div>

              <div>
                <label className="yp-auth-label">Пароль</label>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    e.currentTarget.setCustomValidity('');
                    setPassword(e.target.value);
                  }}
                  onInvalid={(e) => {
                    e.currentTarget.setCustomValidity('Введите пароль');
                  }}
                  required
                  className="yp-auth-input"
                  placeholder="••••••••"
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
                <Link href="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none' }}>
                  Забыли пароль или нет входа через соцсеть?
                </Link>
              </div>

              <CaptchaField onToken={setCaptchaToken} />
            </>
          ) : (
            <div>
              <label className="yp-auth-label">Код 2FA</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="yp-auth-input"
                placeholder="000000"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setNeeds2fa(false);
                  setChallengeToken('');
                  setTotpCode('');
                }}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                ← Назад к паролю
              </button>
            </div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Вход...' : needs2fa ? 'Подтвердить' : 'Войти'}
          </button>
        </form>
        {!needs2fa && sessionStatus === 'authenticated' && session?.user ? (
          <p style={{ textAlign: 'center', marginTop: '1.15rem', fontSize: '0.9rem', lineHeight: 1.45, color: 'var(--muted)' }}>
            Вы уже вошли. Собрать Яндекс, VK и Telegram на одном профиле:{' '}
            <Link href="/dashboard/settings?section=sso" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Настройки → Вход через соцсети
            </Link>
          </p>
        ) : !needs2fa ? (
          <>
            <SocialAuthButtons oauth={oauth} callbackUrl={callbackUrl} showEsia={esiaOn} />
            <p style={{ textAlign: 'center', marginTop: '0.85rem', fontSize: '0.82rem', lineHeight: 1.45, color: 'var(--muted)' }}>
              Почта и пароль работают без Яндекса и Telegram. Соцсеть на этой странице открывает уже связанный профиль —
              чтобы склеить аккаунты, сначала войдите паролем, затем привяжите сеть в кабинете.{' '}
              <Link href="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Восстановить доступ
              </Link>
            </p>
          </>
        ) : null}


        {!maintenanceOn && !staffMode && registrationOn && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
            Нет аккаунта?{' '}
            <Link
              href={
                callbackUrl && callbackUrl !== '/dashboard'
                  ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
                  : '/register'
              }
              style={{ color: 'var(--primary)', fontWeight: 500 }}
            >
              Зарегистрироваться
            </Link>
          </p>
        )}

        {maintenanceOn && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <Link href="/maintenance" style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              ← К заглушке
            </Link>
          </p>
        )}
      </div>
    </AuthStage>
  );
}

export default function LoginPage() {
  return <LoginForm />;
}
