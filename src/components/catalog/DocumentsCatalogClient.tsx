'use client';

import Link from 'next/link';
import { FileText, Eye, Download, FileType } from 'lucide-react';
import { useMemo } from 'react';
import { useSafeSearchParams } from '@/lib/use-safe-search-params';
import type { PublicDocumentCard } from '@/lib/public-catalogs';
import { ORG_STATEMENT_TEMPLATES, STATEMENT_TEMPLATES_CATEGORY } from '@/lib/org-statement-templates';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function DocumentsCatalogClient({ items }: { items: PublicDocumentCard[] }) {
  const sp = useSafeSearchParams();
  const category = (sp.get('category') || '').trim();
  const showTemplates = category === STATEMENT_TEMPLATES_CATEGORY;
  const docs = useMemo(
    () => (category && !showTemplates ? items.filter((d) => d.category === category) : items),
    [items, category, showTemplates]
  );
  const allCats = useMemo(
    () => [...new Set(items.map((d) => d.category))].sort((a, b) => a.localeCompare(b, 'ru')),
    [items]
  );

  const chip = (active: boolean) =>
    ({
      padding: '0.4rem 0.85rem',
      borderRadius: 999,
      fontWeight: 600,
      fontSize: '0.85rem',
      textDecoration: 'none',
      background: active ? 'var(--primary)' : 'rgba(15,23,42,0.05)',
      color: active ? 'white' : 'var(--foreground)',
    }) as const;

  return (
    <div className="container docs-page-shell catalog-page" style={{ padding: '2rem 1rem', minHeight: '60vh' }}>
      <h1 className="page-hero-title">Документы</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '1.05rem' }}>
        Хаб официальных текстов портала и файловой библиотеки.
      </p>
      <nav className="docs-legal-hub" aria-label="Правовые страницы">
        <Link href="/privacy" className="docs-legal-hub__card">
          <strong>Политика конфиденциальности</strong>
          <span>152-ФЗ, cookie, обработка ПДн</span>
        </Link>
        <Link href="/rules" className="docs-legal-hub__card">
          <strong>Правила сайта</strong>
          <span>Поведение на портале и в пространствах</span>
        </Link>
        <Link href="/terms" className="docs-legal-hub__card">
          <strong>Пользовательское соглашение</strong>
          <span>Условия использования сервиса</span>
        </Link>
        <Link href="/documents/verify" className="docs-legal-hub__card">
          <strong>Проверить документ</strong>
          <span>Подлинность выданной справки или грамоты</span>
        </Link>
      </nav>
      <p style={{ color: 'var(--muted)', marginBottom: '1.75rem', fontSize: '1.05rem' }}>
        Ниже — положения и формы в PDF. Типовые заявления — отдельная категория в формате Word (.docx).
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <Link href="/documents" style={chip(!category)}>
          Все
        </Link>
        {allCats.map((c) => (
          <Link key={c} href={`/documents?category=${encodeURIComponent(c)}`} style={chip(category === c)}>
            {c}
          </Link>
        ))}
        <Link
          href={`/documents?category=${encodeURIComponent(STATEMENT_TEMPLATES_CATEGORY)}`}
          style={chip(showTemplates)}
        >
          {STATEMENT_TEMPLATES_CATEGORY}
        </Link>
      </div>

      {showTemplates ? (
        <div className="docs-file-list">
          {ORG_STATEMENT_TEMPLATES.map((t) => (
            <article key={t.id} className="docs-file-row">
              <div className="docs-file-row__icon" aria-hidden>
                <FileType size={24} />
              </div>
              <div className="docs-file-row__body">
                <div className="docs-file-row__meta">
                  {STATEMENT_TEMPLATES_CATEGORY} · DOCX
                </div>
                <h2>{t.title}</h2>
                <p>Скачайте бланк, заполните в Word и приложите к заявке.</p>
              </div>
              <a
                href={`/api/documents/templates/${t.id}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={16} /> Скачать DOCX
              </a>
            </article>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="docs-empty">В этом разделе пока нет опубликованных документов.</div>
      ) : (
        <div className="docs-file-list">
          {docs.map((doc) => (
            <article key={doc.id} className="docs-file-row">
              <div className="docs-file-row__icon" aria-hidden>
                <FileText size={24} />
              </div>
              <div className="docs-file-row__body">
                <div className="docs-file-row__meta">
                  {doc.category} · PDF · {formatSize(doc.sizeBytes)}
                </div>
                <h2>
                  <Link href={`/documents/${doc.id}`} prefetch={false}>{doc.title}</Link>
                </h2>
                {doc.description ? <p>{doc.description}</p> : null}
              </div>
              <div className="docs-file-row__actions">
                <Link href={`/documents/${doc.id}`} prefetch={false} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={16} /> Смотреть
                </Link>
                <a
                  href={`/api/documents/${doc.id}/file?disposition=attachment`}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Скачать PDF
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
