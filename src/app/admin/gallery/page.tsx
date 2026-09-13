import { requirePermissionPage } from '@/lib/acl';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import AdminOrgGalleryEditor from '@/components/admin/AdminOrgGalleryEditor';
import { parseGalleryItems, serializeGalleryItems } from '@/lib/gallery-shared';

export const dynamic = 'force-dynamic';

async function saveGallery(formData: FormData) {
  'use server';
  await requirePermissionPage('pages');
  const orgGallery = String(formData.get('orgGalleryJson') || '').trim();
  const orgGalleryJson = orgGallery
    ? serializeGalleryItems(parseGalleryItems(orgGallery, 48), 48)
    : null;
  await prisma.siteSettings.upsert({
    where: { id: '1' },
    update: { orgGalleryJson },
    create: { id: '1', orgGalleryJson },
  });
  revalidatePath('/admin/gallery');
  revalidatePath('/');
  revalidatePath('/gallery');
  revalidateTag('yp-site-chrome', 'max');
}

export default async function AdminGalleryPage() {
  await requirePermissionPage('pages');
  const settings = await prisma.siteSettings.findUnique({
    where: { id: '1' },
    select: { orgGalleryJson: true },
  });
  return (
    <div className="admin-page">
      <header className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h1>Галерея</h1>
          <p>Фото на главной и на /gallery. Перетащите файлы, расставьте порядок, затем сохраните.</p>
        </div>
        <a href="/gallery" target="_blank" rel="noreferrer" className="btn btn-secondary">
          Открыть на сайте
        </a>
      </header>
      <form action={saveGallery} className="card-surface yp-gedit-form">
        <AdminOrgGalleryEditor initialJson={settings?.orgGalleryJson || ''} />
        <div className="yp-gedit-savebar">
          <button type="submit" className="btn btn-primary">
            Сохранить галерею
          </button>
        </div>
      </form>
    </div>
  );
}
