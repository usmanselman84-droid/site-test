'use client';

import { useEffect, useState } from 'react';
import { parseGalleryItems, serializeGalleryItems, type GalleryItem } from '@/lib/gallery-shared';

export default function AdminOrgGalleryEditor({ initialJson }: { initialJson?: string | null }) {
  const [items, setItems] = useState<GalleryItem[]>(() => parseGalleryItems(initialJson, 48));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  useEffect(() => {
    setItems(parseGalleryItems(initialJson, 48));
  }, [initialJson]);

  const json = serializeGalleryItems(items, 48);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setBusy(true);
    setError('');
    try {
      const added: GalleryItem[] = [];
      for (const file of list) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/org-gallery', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Не удалось загрузить');
        const url = String(data.url || '');
        if (!url) throw new Error('Сервер не вернул ссылку');
        added.push({ url, createdAt: new Date().toISOString() });
      }
      setItems((prev) => [...added, ...prev].slice(0, 48));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setBusy(false);
    }
  }

  function move(from: number, to: number) {
    setItems((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
  }

  return (
    <div
      className="org-gallery-editor"
      onDragOver={(e) => {
        if ([...e.dataTransfer.types].includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          void uploadFiles(e.dataTransfer.files);
        }
      }}
    >
      <input type="hidden" name="orgGalleryJson" value={json} />
      <div className="yp-gedit-drop">
        <label className="btn btn-secondary" style={{ cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Загрузка…' : 'Добавить фото'}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = '';
              if (files?.length) void uploadFiles(files);
            }}
          />
        </label>
        <span className="yp-gedit-hint">Несколько файлов сразу · можно перетащить сюда · {items.length} / 48</span>
      </div>
      {error ? <p style={{ color: '#e11d48', fontSize: '0.82rem' }}>{error}</p> : null}
      <p className="yp-gedit-note">
        Порядок = порядок в ленте. Подпись видна в лайтбоксе и в админке. На главной показывается мозаика без дат.
      </p>
      <div className="yp-gedit-list">
        {items.map((item, idx) => (
          <div
            key={`${item.url}-${idx}`}
            className={`yp-gedit-row${over === idx ? ' is-over' : ''}`}
            draggable
            onDragStart={() => setDrag(idx)}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(idx);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (drag != null) move(drag, idx);
              setDrag(null);
              setOver(null);
            }}
            onDragEnd={() => {
              setDrag(null);
              setOver(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" />
            <div className="yp-gedit-fields">
              <input
                value={item.caption || ''}
                placeholder="Подпись для лайтбокса"
                className="settings-input"
                onChange={(e) => {
                  const caption = e.target.value;
                  setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, caption } : it)));
                }}
              />
              <span className="yp-gedit-date">
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'без даты'}
              </span>
            </div>
            <div className="yp-gedit-actions">
              <button type="button" className="btn btn-secondary" disabled={idx === 0} onClick={() => move(idx, idx - 1)}>
                ↑
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={idx === items.length - 1}
                onClick={() => move(idx, idx + 1)}
              >
                ↓
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                Убрать
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
