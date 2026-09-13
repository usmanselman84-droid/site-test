import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BookingCalendar from '@/components/BookingCalendar';
import BookBackLink from '@/components/BookBackLink';
import { decodeRouteParam } from '@/lib/route-id';

export const dynamic = 'force-dynamic';

export default async function BookSpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const resolvedParams = await params;
  const q = (await searchParams) || {};
  const fromList = q.from === 'list';
  const id = decodeRouteParam(resolvedParams.id);
  const [space, settings] = await Promise.all([
    prisma.space.findUnique({
      where: { id },
    }),
    prisma.siteSettings.findUnique({ where: { id: '1' } }),
  ]);

  if (!space || space.status === 'COMPLETED') {
    notFound();
  }

  const settingsHours = settings as {
    bookingOpenTime?: string | null;
    bookingCloseTime?: string | null;
    minBookingHours?: number | null;
  } | null;

  const openTime = settingsHours?.bookingOpenTime || '09:00';
  const closeTime = settingsHours?.bookingCloseTime || '21:00';
  const minBookingHours = settingsHours?.minBookingHours ?? 3;

  return (
    <div className="container booking-page--dock" style={{ padding: '2rem 1rem', minHeight: '60vh' }}>
      <div>
        <BookBackLink spaceId={space.id} fromList={fromList} />

        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--foreground)' }}>
          Бронирование: {space.title}
        </h1>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
          Выберите дату и время для бронирования или присоединяйтесь к открытым мероприятиям.
        </p>

        <div className="booking-page-panel">
          <BookingCalendar
            spaceId={space.id}
            spaceCapacity={space.capacity}
            openTime={openTime}
            closeTime={closeTime}
            minBookingHours={minBookingHours}
          />
        </div>
      </div>
    </div>
  );
}
