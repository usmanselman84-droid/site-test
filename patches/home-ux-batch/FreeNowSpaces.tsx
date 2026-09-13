import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  buildOccupancyWeek,
  buildWeekDayKeys,
  nextFreeWindow,
  parseOpenClose,
} from '@/lib/hall-occupancy';
import { spaceCover } from '@/lib/theme-covers';
import EntityCoverImage from '@/components/EntityCoverImage';
import HomeLiftFeedCard from '@/components/HomeLiftFeedCard';
import HomeSlideRail from '@/components/HomeSlideRail';
import { ArrowRight } from 'lucide-react';
import { encodeRouteParam } from '@/lib/route-id';
import { isCoworkingSpace } from '@/lib/coworking';
import { isNextBuildPhase } from '@/lib/build-phase';

type FreeNowCard = {
  id: string;
  title: string;
  address: string | null;
  category: string | null;
  image: string | null;
  coworking: boolean;
  slotLabel: string;
  idx: number;
};

const loadFreeNowCards = unstable_cache(
  async (limit: number): Promise<FreeNowCard[]> => {
    if (isNextBuildPhase()) return [];
    const spaces = await prisma.space.findMany({
      where: { status: 'ACTIVE', isDemoData: false },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        address: true,
        category: true,
        image: true,
        bookingMode: true,
        openTime: true,
        closeTime: true,
        slotStepMin: true,
      },
    });
    if (!spaces.length) return [];

    const settings = await prisma.siteSettings.findUnique({
      where: { id: '1' },
      select: { bookingOpenTime: true, bookingCloseTime: true },
    });
    const dayKeys = buildWeekDayKeys(new Date(), 2);
    const rangeStart = new Date(`${dayKeys[0]}T00:00:00+03:00`);
    const rangeEnd = new Date(`${dayKeys[dayKeys.length - 1]}T23:59:59+03:00`);
    const ids = spaces.map((s) => s.id);

    const [bookings, closures] = await Promise.all([
      prisma.booking.findMany({
        where: {
          spaceId: { in: ids },
          status: { in: ['APPROVED', 'PENDING'] },
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: {
          id: true,
          spaceId: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          contactMode: true,
        },
      }),
      prisma.spaceClosure.findMany({
        where: {
          spaceId: { in: ids },
          startTime: { lt: rangeEnd },
          endTime: { gt: rangeStart },
        },
        select: { spaceId: true, startTime: true, endTime: true, kind: true, note: true },
      }),
    ]);

    const cards: FreeNowCard[] = [];
    spaces.forEach((space, idx) => {
      const { openMin, closeMin } = parseOpenClose(
        space.openTime,
        space.closeTime,
        settings?.bookingOpenTime,
        settings?.bookingCloseTime
      );
      const week = buildOccupancyWeek({
        openMin,
        closeMin,
        stepMin: space.slotStepMin === 30 ? 30 : 60,
        dayKeys,
        bookings: bookings.filter((b) => b.spaceId === space.id),
        closures: closures.filter((c) => c.spaceId === space.id),
      });
      const next = nextFreeWindow(week);
      if (!next) return;
      cards.push({
        id: space.id,
        title: space.title,
        address: space.address,
        category: space.category,
        image: space.image,
        coworking: isCoworkingSpace(space),
        slotLabel: next.label,
        idx,
      });
    });
    return cards.slice(0, limit);
  },
  ['free-now-home-v1'],
  { revalidate: 45, tags: ['yp-home-catalog'] }
);

export default async function FreeNowSpaces({ limit = 6 }: { limit?: number }) {
  if (isNextBuildPhase()) return null;
  const cards = await loadFreeNowCards(limit);
  if (!cards.length) return null;

  return (
    <section className="home-section free-now">
      <div className="home-section-head">
        <div>
          <h2 className="home-section-title">Сейчас свободно</h2>
          <p className="home-section-sub">Можно зайти без очереди — ближайшие окна ЦРМ</p>
        </div>
        <Link href="/spaces" className="home-section-link">
          Все пространства <ArrowRight size={18} />
        </Link>
      </div>
      <HomeSlideRail label="Сейчас свободно">
        {cards.map((card) => {
          const href = `/spaces/${encodeRouteParam(card.id)}`;
          return (
            <HomeLiftFeedCard
              key={card.id}
              href={href}
              badge={card.category || 'Площадка'}
              title={card.title}
              line={card.address || 'Сочи'}
              highlight={card.slotLabel}
              secondary={{ href, label: 'Расписание' }}
              primary={{
                href: card.coworking
                  ? `/coworking?space=${encodeURIComponent(card.id)}`
                  : `${href}/book?from=list`,
                label: card.coworking ? 'В коворкинг' : 'Забронировать',
              }}
              cover={
                <EntityCoverImage
                  src={spaceCover(card, card.idx)}
                  alt={card.title}
                  fallback={spaceCover(card, card.idx + 2)}
                  className="free-now-img"
                  sizes="(max-width: 768px) 85vw, 280px"
                />
              }
            />
          );
        })}
      </HomeSlideRail>
    </section>
  );
}
