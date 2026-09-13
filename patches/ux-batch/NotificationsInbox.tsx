'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  notificationTypeLabel,
  resolveNotificationHref,
} from '@/lib/notification-meta';

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  meta?: string | null;
};

export default function NotificationsInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<'unread' | 'all'>('unread');

  const load = useCallback(() => {
    fetch('/api/user/notifications?take=80', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.items)) setItems(d.items);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter((i) => !i.readAt).length;
  const visible = useMemo(() => {
    if (scope === 'unread') {
      const u = items.filter((i) => !i.readAt);
      return u.length ? u : items;
    }
    return items;
  }, [items, scope]);

  const mark = async (body: { all?: boolean; id?: string }) => {
    await fetch('/api/user/notifications', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    load();
  };

  return (
    <div className="profile-view" style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 0.85rem 5rem' }}>
      <div className="profile-page-head">
        <div>
          <h1 className="profile-view__title">Уведомления</h1>
          <p className="profile-view__lead">Сначала новые. Непрочитанные выделены слева и точкой.</p>
        </div>
        {unreadCount > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => void mark({ all: true })}>
            Прочитать все
          </button>
        ) : null}
      </div>
      <div className="yp-notif-inbox-scope" role="tablist">
        <button
          type="button"
          role="tab"
          className={scope === 'unread' ? 'is-on' : ''}
          onClick={() => setScope('unread')}
        >
          Новые{unreadCount ? ` · ${unreadCount}` : ''}
        </button>
        <button type="button" role="tab" className={scope === 'all' ? 'is-on' : ''} onClick={() => setScope('all')}>
          Все · {items.length}
        </button>
      </div>
      {loading ? (
        <p className="profile-view__lead">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="profile-empty">Пока нет уведомлений. Покупка в магазине, заявки и сообщения появятся здесь.</p>
      ) : (
        <ul className="yp-notif-inbox">
          {visible.map((n) => {
            const href = resolveNotificationHref(n);
            return (
              <li key={n.id} className={n.readAt ? '' : 'is-unread'}>
                <Link
                  href={href || '/dashboard'}
                  onClick={() => {
                    if (!n.readAt) void mark({ id: n.id });
                  }}
                >
                  <span className="yp-notif-inbox__dot" aria-hidden={!n.readAt} />
                  <span className="yp-notif-panel__type-chip">{notificationTypeLabel(n.type)}</span>
                  <strong>{n.title}</strong>
                  <em>{n.body}</em>
                  <time dateTime={n.createdAt}>
                    {new Date(n.createdAt).toLocaleString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Moscow',
                    })}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
