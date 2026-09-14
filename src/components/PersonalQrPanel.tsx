'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import MobileSheet from '@/components/ui/MobileSheet';
import { History, Maximize2, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';

type HistoryItem = {
  id: string;
  kind: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PersonalQrPanel({ open, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    try {
      const r = await fetch('/api/presence-qr', {
        method: force ? 'POST' : 'GET',
        credentials: 'same-origin',
        headers: force ? { 'Content-Type': 'application/json' } : undefined,
        body: force ? JSON.stringify({ action: 'rotate' }) : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Ошибка');
      const qr = data.qr || {};
      setUrl(qr.url || '');
      setExpiresAt(qr.expiresAt || null);
      if (data.history) setHistory(data.history);
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Не удалось загрузить QR');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
      setShowHistory(false);
      return;
    }
    load(false);
  }, [open, load]);

  const dismiss = () => {
    setFullscreen(false);
    setShowHistory(false);
    onClose();
  };

  const qrSize = mounted && window.matchMedia('(max-width: 700px)').matches ? 220 : 260;

  const fs =
    mounted && fullscreen && url
      ? createPortal(
          <div
            className="presence-fs"
            role="dialog"
            aria-modal="true"
            aria-label="Пропуск на весь экран"
            onClick={dismiss}
          >
            <button
              type="button"
              className="presence-fs-close"
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
            >
              Закрыть
            </button>
            <div className="presence-fs__card" onClick={(e) => e.stopPropagation()}>
              <QRCodeDisplay value={url} size={Math.min(360, Math.floor(window.innerWidth * 0.78))} />
              <p className="presence-fs__hint">Покажите QR на входе</p>
              <button
                type="button"
                className="btn btn-primary presence-fs__done"
                onClick={dismiss}
              >
                Закрыть
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <MobileSheet open={open} onOpenChange={(v) => { if (!v) onClose(); }} title="Пропуск">
        <div className="presence-qr-plain">
          <h2>Пропуск</h2>
          <p className="presence-pass-sheet__lead">QR на входе. Откройте, когда вас просят показать пропуск.</p>
          {loading && !url ? <p className="presence-muted">Готовим QR…</p> : null}
          {error ? <p className="presence-error">{error}</p> : null}
          {url ? (
            <div className="presence-qr-wrap">
              <QRCodeDisplay value={url} size={qrSize} />
              <p className="presence-muted">Рамка вокруг кода статичная — это не загрузка.</p>
              <div className="presence-qr-actions">
                <button type="button" className="btn btn-primary" onClick={() => setFullscreen(true)}>
                  <Maximize2 size={16} /> На вход
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => load(true)}>
                  <RefreshCw size={16} /> Обновить
                </button>
                <button
                  type="button"
                  className="btn btn-secondary presence-history-btn"
                  onClick={() => setShowHistory(true)}
                  aria-label="История баллов"
                >
                  <History size={16} /> История
                </button>
              </div>
              {expiresAt ? (
                <p className="presence-muted">
                  до {new Date(expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </MobileSheet>
      <MobileSheet open={open && showHistory} onOpenChange={(v) => !v && setShowHistory(false)} title="История">
        {history.length === 0 ? (
          <p className="presence-muted">Пока нет записей.</p>
        ) : (
          <ul className="presence-history-list">
            {history.slice(0, 30).map((h) => (
              <li key={h.id}>
                <span className={`presence-delta ${h.delta >= 0 ? 'is-plus' : 'is-minus'}`}>
                  {h.delta >= 0 ? '+' : ''}
                  {h.delta} {h.kind === 'ECO_POINTS' || h.kind === 'ECO' ? 'М-баллы' : 'репутация'}
                </span>
                <span className="presence-reason">{h.reason}</span>
                <time dateTime={h.createdAt}>
                  {new Date(h.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </MobileSheet>
      {fs}
    </>
  );
}
