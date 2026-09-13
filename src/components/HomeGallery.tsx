import Link from 'next/link';
import PhotoGallery from '@/components/PhotoGallery';
import { parseGalleryItems } from '@/lib/gallery-shared';

type Props = {
  orgGalleryJson?: string | null;
  enabled?: boolean;
  title?: string;
};

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function HomeGallery({
  orgGalleryJson,
  enabled = true,
  title = 'Деятельность портала',
}: Props) {
  if (!enabled) return null;
  const items = shuffle(parseGalleryItems(orgGalleryJson, 48))
    .slice(0, 12)
    .map((i) => ({ url: i.url, caption: i.caption || title }));
  if (!items.length) return null;

  return (
    <section className="home-section home-gallery">
      <div className="home-section-head">
        <div>
          <h2 className="home-section-title">{title}</h2>
          <p className="home-section-sub">Мозаика кадров — откройте фото и листайте</p>
        </div>
        <Link href="/gallery" className="home-section-link">
          Смотреть все
        </Link>
      </div>
      <PhotoGallery items={items} hideTitle mosaic />
    </section>
  );
}
