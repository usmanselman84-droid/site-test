import UpcomingEvents from '@/components/UpcomingEvents';
import GlobalCalendar from '@/components/GlobalCalendar';
import { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSiteIdentity, identityFromSettings } from '@/lib/site-identity';
import { brandedMetadata } from '@/lib/branded-metadata';
import AuthAfishaSection from '@/components/AuthAfishaSection';
import { isNextBuildPhase } from '@/lib/build-phase';
import { getCachedPublicClubs } from '@/lib/public-catalogs';
import { encodeRouteParam } from '@/lib/route-id';

export async function generateMetadata(): Promise<Metadata> {
  const { siteName } = await getSiteIdentity();
  return brandedMetadata('Афиша мероприятий', {
    description: `Календарь мероприятий — ${siteName}. Запись на события и бронирование площадок.`,
    canonicalPath: '/events',
  });
}

export const revalidate = 60;

const getCachedUpcomingBookings = unstable_cache(
  async () => {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: '1' },
      select: { publicEventsVisibility: true, siteName: true, publicSiteUrl: true },
    });
    const upcoming = settings?.publicEventsVisibility ? await fetchUpcoming() : [];
    return { settings, upcoming };
  },
  ['afisha-upcoming-jsonld-v1'],
  { revalidate: 60, tags: ['yp-home-catalog'] }
);

async function fetchUpcoming() {
  return prisma.booking.findMany({
    where: { status: 'APPROVED', startTime: { gte: new Date() } },
    include: { space: { select: { title: true, address: true } } },
    orderBy: { startTime: 'asc' },
    take: 20,
  });
}

export default async function EventsPage() {
  const cached = isNextBuildPhase()
    ? { settings: null, upcoming: [] as Awaited<ReturnType<typeof fetchUpcoming>> }
    : await getCachedUpcomingBookings();
  const settings = cached.settings;
  const upcoming = cached.upcoming;
  const identity = identityFromSettings(settings);
  const clubs = await getCachedPublicClubs().catch(() => []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Афиша мероприятий',
    itemListElement: upcoming.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.title,
        startDate: e.startTime.toISOString(),
        endDate: e.endTime.toISOString(),
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: {
          '@type': 'Place',
          name: e.space?.title || 'Площадка',
          address: e.space?.address || 'Сочи',
        },
        organizer: {
          '@type': 'Organization',
          name: identity.siteName,
          url: identity.publicOrigin,
        },
      },
    })),
  };

  return (
    <div className="container" style={{ padding: '1rem 1rem 3rem', minHeight: 'auto' }}>
      {upcoming.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      ) : null}

      <h1 className="page-hero-title" style={{ marginBottom: '0.35rem' }}>
        Афиша мероприятий
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.15rem', fontSize: '0.98rem' }}>
        Календарь, ближайшие события площадок и клубы, куда можно записаться
      </p>

      <section aria-label="Календарь" style={{ marginBottom: '1.75rem' }}>
        {settings?.publicEventsVisibility ? (
          <p className="afisha-guest-note">Гости видят календарь. Чтобы записаться на событие — войдите в кабинет.</p>
        ) : (
          <p className="afisha-guest-note">Календарь для гостей выключен в настройках сайта. После входа афиша открывается полностью.</p>
        )}
        <GlobalCalendar guestOpen={Boolean(settings?.publicEventsVisibility)} />
      </section>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.85rem' }}>Ближайшие события</h2>
      {settings?.publicEventsVisibility ? (
        <UpcomingEvents hideTitle mode="grid" />
      ) : (
        <AuthAfishaSection hideTitle />
      )}

      {clubs.length ? (
        <section className="home-section" style={{ marginTop: '1.75rem' }} aria-label="Клубы">
          <div className="home-section-head">
            <h2 className="home-section-title" style={{ fontSize: '1.2rem' }}>
              Клубы
            </h2>
            <Link href="/clubs" className="home-section-link">
              Все клубы
            </Link>
          </div>
          <ul className="events-clubs-list">
            {clubs.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/clubs/${encodeRouteParam(c.id)}`}>{c.title.replace(/^Клуб:\s*/i, '')}</Link>
                {c.meetingSchedule ? <span>{c.meetingSchedule}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
