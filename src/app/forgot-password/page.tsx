'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthStage from '@/components/AuthStage';

type Mode = 'email' | 'phrase';

export default function ForgotPassword() {
  const [mode, setMode] = useState<Mode>('email');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [emailReady, setEmailReady] = useState(true);
  const [ssoAvailable, setSsoAvailable] = useState(true);

  useEffect(() => {
    fetch('/api/public/status')
      .then((r) => r.json())
      .then((d) => {
        const mail = d?.passwordResetEmailReady !== false;
        setEmailReady(mail);
        setSsoAvailable(d?.ssoAvailable !== false);
        if (!mail) setMode('phrase');
      })
      .catch(() => {
        setEmailReady(false);
        setMode('phrase');
      });
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(
          'Если аккаунт с этой почтой есть, мы отправили ссылку на сброс. Проверьте входящие и спам. Ссылка живёт 1 час.'
        );
      } else if (res.status === 503 || data.emailSkipped) {
        setEmailReady(false);
        setMode('phrase');
        setStatus('error');
        setMessage(
          data.message ||
            'Письмо сейчас отправить нельзя. Сбросьте пароль фразой из 24 слов (кабинет → Безопасность) или напишите в контакты.'
        );
      } else {
        setStatus('error');
        setMessage(data.message || 'Произошла ошибка');
      }
    } catch {
      setStatus('error');
      setMessage('Нет связи с сервером. Попробуйте фразу из 24 слов или зайдите позже.');
    }
  };

  const handlePhraseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    const formData = new FormData(e.currentTarget);
    const login = String(formData.get('login') || formData.get('email') || '');
    const phrase = String(formData.get('phrase') || '');
    const password = String(formData.get('password') || '');
    const confirm = String(formData.get('confirm') || '');

    if (password !== confirm) {
      setStatus('error');
      setMessage('Пароли не совпадают');
      return;
    }

    try {
      const res = await fetch('/api/auth/recovery-phrase/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, email: login, phrase, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Пароль изменён. Войдите с новым паролем — соцсеть не нужна.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Произошла ошибка');
      }
    } catch {
      setStatus('error');
      setMessage('Ошибка соединения сервера');
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setStatus('idle');
    setMessage('');
  };

  return (
    <AuthStage>
      <div className="yp-auth-card">
        <h1 className="auth-form-title">Восстановление доступа</h1>
        <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.45 }}>
          Это запасной вход, если Яндекс или Telegram не открываются. Сначала попробуйте{' '}
          <Link href="/login">войти паролем</Link>. Нет пароля — письмо или фраза из 24 слов.
        </p>
        {!ssoAvailable ? (
          <p className="yp-auth-alert yp-auth-alert--warn" style={{ marginBottom: '1rem' }}>
            Соцсети сейчас недоступны. Восстановление только паролем, письмом или фразой.
          </p>
        ) : null}
        {!emailReady ? (
          <p className="yp-auth-alert yp-auth-alert--warn" style={{ marginBottom: '1rem' }}>
            Почта для сброса сейчас не отправляется. Используйте вкладку «24 слова» или{' '}
            <Link href="/contacts">напишите администрации</Link>.
          </p>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            marginBottom: '1.25rem',
            padding: 4,
            borderRadius: 12,
            background: 'rgba(15,23,42,0.05)',
          }}
        >
          <button
            type="button"
            onClick={() => switchMode('email')}
            className="btn"
            disabled={!emailReady}
            style={{
              padding: '0.55rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              background: mode === 'email' ? 'var(--primary)' : 'transparent',
              color: mode === 'email' ? '#fff' : 'var(--muted)',
              border: 'none',
              opacity: emailReady ? 1 : 0.55,
            }}
          >
            По email
          </button>
          <button
            type="button"
            onClick={() => switchMode('phrase')}
            className="btn"
            style={{
              padding: '0.55rem',
              fontWeight: 700,
              fontSize: '0.82rem',
              background: mode === 'phrase' ? 'var(--primary)' : 'transparent',
              color: mode === 'phrase' ? '#fff' : 'var(--muted)',
              border: 'none',
            }}
          >
            24 слова
          </button>
        </div>

        {status === 'success' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--success)', marginBottom: '1.5rem', fontWeight: 500 }}>{message}</p>
            <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block', width: '100%', textDecoration: 'none' }}>
              Вернуться ко входу
            </Link>
          </div>
        ) : mode === 'email' ? (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {status === 'error' && (
              <p style={{ color: 'var(--destructive)', fontSize: '0.9rem', margin: 0 }}>{message}</p>
            )}
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Пришлём ссылку на сброс, если такой email есть. Для аккаунта только через Telegram сначала задайте пароль в
              кабинете, пока соцсеть ещё работает.
            </p>
            <div>
              <label className="yp-auth-label">Ваш Email</label>
              <input name="email" type="email" required className="modern-input" placeholder="mail@yandex.ru" />
            </div>
            <button type="submit" disabled={status === 'loading'} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.8rem' }}>
              {status === 'loading' ? 'Отправка...' : 'Прислать ссылку'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link href="/login" style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                Я вспомнил пароль
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePhraseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {status === 'error' && (
              <p style={{ color: 'var(--destructive)', fontSize: '0.9rem', margin: 0 }}>{message}</p>
            )}
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              Фраза из 24 русских слов создаётся в кабинете → Безопасность, пока вы ещё внутри. Порядок слов важен. Без
              фразы и без пароля доступ восстановит только администратор через{' '}
              <Link href="/contacts">контакты</Link>.
            </p>
            <div>
              <label className="yp-auth-label">Email или телефон</label>
              <input name="login" type="text" required className="modern-input" placeholder="mail@yandex.ru или +7…" autoComplete="username" />
            </div>
            <div>
              <label className="yp-auth-label">Фраза из 24 слов</label>
              <textarea
                name="phrase"
                required
                rows={5}
                className="modern-input"
                placeholder="слово1 слово2 … слово24"
                style={{ width: '100%', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '0.88rem' }}
              />
            </div>
            <div>
              <label className="yp-auth-label">Новый пароль</label>
              <input name="password" type="password" required minLength={10} className="modern-input" placeholder="от 10 символов, буквы и цифры" />
            </div>
            <div>
              <label className="yp-auth-label">Повторите пароль</label>
              <input name="confirm" type="password" required minLength={10} className="modern-input" placeholder="ещё раз" />
            </div>
            <button type="submit" disabled={status === 'loading'} className="btn btn-primary" style={{ marginTop: '0.5rem', padding: '0.8rem' }}>
              {status === 'loading' ? 'Проверяем…' : 'Сбросить пароль по фразе'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <Link href="/login" style={{ color: 'var(--accent)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                Я вспомнил пароль
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthStage>
  );
}
