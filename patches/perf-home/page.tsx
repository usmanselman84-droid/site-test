import { Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import HomeServiceHero, { HomeSochiStrip } from '@/components/HomeServiceHero';
import HomeGallery from '@/components/HomeGallery';
import HomeLiftFeedCard from '@/components/HomeLiftFeedCard';
import { isLocalOrigin } from '@/lib/site-identity';
import { getCachedPublicChromeSettings } from '@/lib/public-chrome-settings';
import { clubCover, projectCover, spaceCover } from '@/lib/theme-covers';
import { getHomeCatalog } from '@/lib/home-catalog';
import { resolveHomeHeroPoster } from '@/lib/home-hero';
import { formatRuDate } from '@/lib/format-date';
import { getModuleFlags } from '@/lib/module-flags';
import FreeNowSpaces from '@/components/FreeNowSpaces';
import GovWidgetsSection from '@/components/GovWidgetsSection';
import { ArrowRight } from 'lucide-react';
import NewsCoverImage from '@/components/NewsCoverImage';
import EntityCoverImage from '@/components/EntityCoverImage';
import NewsMediaBadge from '@/components/NewsMediaBadge';
import Link from 'next/link';
import { Metadata } from 'next';
import { encodeRouteParam } from '@/lib/route-id';

const HomeSlideRail = nextDynamic(() => import('@/components/HomeSlideRail'), {
  loading: () => <div className="home-deferred-skel" aria-hidden />,
});
const HomeGalleryAuth = nextDynamic(() => import('@/components/HomeGalleryAuth'));
const AuthAfishaSection = nextDynamic(() => import('@/components/AuthAfishaSection'));
const UpcomingEvents = nextDynamic(() => import('@/components/UpcomingEvents'));

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, publicOrigin } = await getCachedPublicChromeSettings();
  const publicUrl = isLocalOrigin(publicOrigin) ? undefined : publicOrigin;
  return {
    title: { absolute: `${siteName} | Официальный портал` },
    description: `Официальный портал ${siteName}: залы, коворкинг, клубы, афиша и новости Центра развития молодёжи Сочи.`,
    ...(publicUrl ? { alternates: { canonical: publicUrl } } : {}),
  };
}

export const revalidate = 60;

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default async function Home() {
  const [{ latestProjects, latestClubs, latestSpaces, latestNews, siteSettings }, modules, chrome] =
    await Promise.all([getHomeCatalog(), getModuleFlags(), getCachedPublicChromeSettings()]);
  const siteName = (siteSettings?.siteName || chrome.siteName || '').trim() || chrome.siteName;
  const heroUrl = resolveHomeHeroPoster(siteSettings?.heroImageUrl);
  // Both assets may be stored; display mode is exclusive (image | video).
  const heroVideo = (siteSettings?.heroVideoUrl || '').trim() || null;
  const storedKind = (siteSettings?.heroMediaKind || '').trim().toLowerCase();
  // Strictly follow admin radio: video only when kind is video AND a file exists.
  const heroMediaKind: 'image' | 'video' =
    storedKind === 'video' && Boolean(heroVideo) ? 'video' : 'image';
  const galleryPublic =
    modules.gallery !== false &&
    Boolean(siteSettings?.galleryHomepageEnabled) &&
    Boolean(siteSettings?.galleryPublicEnabled);
  const galleryAuthOnly =
    modules.gallery !== false &&
    Boolean(siteSettings?.galleryHomepageEnabled) &&
    !siteSettings?.galleryPublicEnabled;

  const showProjects = modules.projects !== false;
  const showClubs = modules.clubs !== false;
  const showSpaces = modules.spaces !== false;
  const showEvents = modules.events !== false;
  const showNews = modules.news !== false;
  const showDocuments = modules.documents !== false;

  const heroPrimary = showSpaces
    ? { href: '/coworking', label: 'Записаться' }
    : showEvents
      ? { href: '/events', label: 'Записаться' }
      : showProjects
        ? { href: '/projects', label: 'Проекты' }
        : null;
  const heroSecondary = showSpaces
    ? { href: '/spaces', label: 'Залы' }
    : showEvents
      ? { href: '/events', label: 'Афиша' }
      : null;

  return (
    <div className="home-page home-page--lift">
      {heroMediaKind === 'image' ? (
        <link
          rel="preload"
          as="image"
          href={heroUrl.replace(/\.(jpe?g|png)$/i, '.webp')}
          type="image/webp"
          fetchPriority="high"
        />
      ) : null}
      <HomeServiceHero
        siteName={siteName}
        imageUrl={heroUrl}
        videoUrl={heroVideo}
        mediaKind={heroMediaKind === 'video' && heroVideo ? 'video' : 'image'}
        primary={heroPrimary}
        secondary={heroSecondary}
        faceUrls={latestSpaces.slice(0, 3).map((s, i) => spaceCover(s, i))}
        showSpaces={showSpaces}
        showClubs={showClubs}
        showProjects={showProjects}
        showEvents={showEvents}
      />
      <HomeSochiStrip />

      <div className="container home-sections">
        {showSpaces ? (
          <Suspense fallback={<div className="home-deferred-skel" aria-hidden />}>
            <FreeNowSpaces limit={6} />
          </Suspense>
        ) : null}

        {showProjects && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Свежие проекты</h2>
              <p className="home-section-sub">Инициативы, в которые можно включиться сейчас</p>
            </div>
            <Link href="/projects" className="home-section-link">
              Смотреть все <ArrowRight size={18} />
            </Link>
          </div>
          {latestProjects.length === 0 ? (
            <p className="home-empty">Пока нет опубликованных проектов.</p>
          ) : (
            <HomeSlideRail label="Свежие проекты">
              {latestProjects.map((project, idx) => {
                const href = `/projects/${encodeRouteParam(project.id)}`;
                return (
                  <HomeLiftFeedCard
                    key={project.id}
                    href={href}
                    badge="Проект"
                    title={project.title}
                    line={stripHtml(project.description)}
                    highlight="Центр развития молодёжи"
                    secondary={{ href, label: 'Подробнее' }}
                    primary={{ href, label: 'Участвовать' }}
                    cover={
                      <EntityCoverImage
                        src={projectCover(project, idx)}
                        alt={project.title}
                        fallback={projectCover(project, idx + 3)}
                        className="free-now-img"
                        sizes="(max-width: 768px) 85vw, 280px"
                      />
                    }
                  />
                );
              })}
            </HomeSlideRail>
          )}
        </section>
        )}

        {showClubs && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Клубы по интересам</h2>
              <p className="home-section-sub">Найти своих в Сочи — не в чате на 400 человек</p>
            </div>
            <Link href="/clubs" className="home-section-link">
              Все клубы <ArrowRight size={18} />
            </Link>
          </div>
          {latestClubs.length === 0 ? (
            <p className="home-empty">Клубы скоро появятся в каталоге.</p>
          ) : (
            <HomeSlideRail label="Клубы по интересам">
              {latestClubs.map((club, idx) => {
                const href = `/clubs/${encodeRouteParam(club.id)}`;
                return (
                  <HomeLiftFeedCard
                    key={club.id}
                    href={href}
                    badge="Клуб"
                    title={club.title}
                    line={club.meetingPlace || stripHtml(club.description)}
                    highlight={club.meetingSchedule || 'Расписание на странице клуба'}
                    secondary={{ href, label: 'Подробнее' }}
                    primary={{ href, label: 'В клуб' }}
                    cover={
                      <EntityCoverImage
                        src={clubCover(club, idx)}
                        alt={club.title}
                        fallback={clubCover(club, idx + 3)}
                        className="free-now-img"
                        sizes="(max-width: 768px) 85vw, 280px"
                      />
                    }
                  />
                );
              })}
            </HomeSlideRail>
          )}
        </section>
        )}

        {showEvents && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Афиша</h2>
              <p className="home-section-sub">Актуальные события площадок</p>
            </div>
            <Link href="/events" className="home-section-link">
              Календарь <ArrowRight size={18} />
            </Link>
          </div>
          {siteSettings?.publicEventsVisibility ? (
            <Suspense fallback={<div className="home-deferred-skel" aria-hidden />}>
              <UpcomingEvents hideTitle compact withinDays={14} mode="carousel" />
            </Suspense>
          ) : (
            <AuthAfishaSection hideTitle />
          )}
        </section>
        )}

        {galleryPublic ? (
          <Suspense fallback={null}>
            <HomeGallery
              enabled
              orgGalleryJson={siteSettings?.orgGalleryJson}
              title="Сочи в кадре"
            />
          </Suspense>
        ) : galleryAuthOnly ? (
          <HomeGalleryAuth homepageEnabled title="Сочи в кадре" />
        ) : null}

        {showNews && (
        <section className="home-section">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Новости</h2>
              <p className="home-section-sub">Коротко: что уже случилось в городе</p>
            </div>
            <Link href="/news" className="home-section-link">
              Все новости <ArrowRight size={18} />
            </Link>
          </div>
          {latestNews.length === 0 ? (
            <p className="home-empty">Новостей пока нет — загляните позже.</p>
          ) : (
            <HomeSlideRail label="Новости">
              {latestNews.map((item) => {
                const when = item.publishedAt || item.createdAt;
                const title = item.title?.trim() || stripHtml(item.text).slice(0, 80) || 'Новость';
                const href = `/news/${encodeRouteParam(item.id)}`;
                return (
                  <HomeLiftFeedCard
                    key={item.id}
                    href={href}
                    badge={item.videoEmbedUrl ? 'Видео' : 'Новость'}
                    title={title}
                    line={stripHtml(item.text)}
                    highlight={formatRuDate(when, { day: 'numeric', month: 'long' })}
                    primary={{ href, label: 'Читать' }}
                    cover={
                      <>
                        <NewsCoverImage
                          src={item.imageUrl}
                          alt={title}
                          seed={item.id}
                          className="free-now-img"
                          sizes="(max-width: 768px) 85vw, 280px"
                        />
                        <NewsMediaBadge hasVideo={!!item.videoEmbedUrl} />
                      </>
                    }
                  />
                );
              })}
            </HomeSlideRail>
          )}
        </section>
        )}

        <GovWidgetsSection
          enabled={Boolean(siteSettings?.govWidgetsEnabled)}
          title={siteSettings?.govWidgetsTitle || 'Госуслуги'}
          widgetsJson={siteSettings?.govWidgetsJson}
          variant="compact"
        />

        <section className="home-cta home-cta--split" aria-label="Два сценария">
          <div className="home-cta-split">
            <article>
              <p>Для себя</p>
              <h2>Сесть и сделать</h2>
              <p className="home-cta-text">Коворкинг на час — без переписки и без «есть ли место».</p>
              {showSpaces ? (
                <Link href="/coworking" className="lift-hero__btn lift-hero__btn--lime">
                  Записаться
                </Link>
              ) : (
                <Link href="/contacts" className="lift-hero__btn lift-hero__btn--lime">
                  Контакты
                </Link>
              )}
            </article>
            <article>
              <p>Командой</p>
              <h2>Собрать людей</h2>
              <p className="home-cta-text">Зал под встречу или проект, который видно в портфолио.</p>
              {showSpaces ? (
                <Link href="/spaces" className="lift-hero__btn lift-hero__btn--lime">
                  К площадкам
                </Link>
              ) : showProjects ? (
                <Link href="/projects" className="lift-hero__btn lift-hero__btn--lime">
                  К проектам
                </Link>
              ) : (
                <Link href="/contacts" className="lift-hero__btn lift-hero__btn--lime">
                  Контакты
                </Link>
              )}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
