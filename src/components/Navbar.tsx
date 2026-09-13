'use client';

function modOn(settings: any, key: string) {
  try {
    const raw = settings?.moduleFlagsJson;
    if (!raw) return true;
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return true;
    if (typeof o[key] === 'boolean') return o[key] !== false;
    // Legacy umbrella `programs` → grants / dobro / self_gov
    if (
      (key === 'grants' || key === 'dobro' || key === 'self_gov') &&
      typeof o.programs === 'boolean'
    ) {
      return o.programs !== false;
    }
  } catch {
    /* ignore */
  }
  return true;
}


import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { publicCmsTitle } from '@/lib/cms-page-copy';
import {
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  LogOut,
  Ticket,
  LayoutDashboard,
  UserCircle,
  Bell,
  Settings,
  Users,
  Award,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Gamepad2,
  HandHeart,
  Image as ImageIcon,
  Landmark,
  MapPin,
  Newspaper,
  Sparkles,
  Phone,
  Home,
  Shield,
  MessageCircle,
  BookOpen,
  ShoppingBag,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import GuestAuthPrompt from '@/components/GuestAuthPrompt';
import NavDropdownPortal from '@/components/NavDropdownPortal';
import SiteBrand from '@/components/SiteBrand';
import NavProfileCard from '@/components/NavProfileCard';
import UserAvatar from '@/components/UserAvatar';
import NotificationsBell from '@/components/NotificationsBell';
import { publicPagePath } from '@/lib/public-paths';
import { signOutLogged } from '@/lib/sign-out-logged';
import { encodeRouteParam } from '@/lib/route-id';
import { isPrimaryHeaderSlug } from '@/lib/nav-catalog';
import { fetchProfileCached } from '@/lib/user-data-client';
import { persistSessionHint, readSessionHint } from '@/lib/session-hint';

type OpenMenu = 'projects' | 'clubs' | 'spaces' | 'more' | 'account' | null;

/** Chrome links: no viewport RSC prefetch (dozens of in-flight fetches on short pages). */
function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}

export default function Navbar({
  spaces = [],
  clubs = [],
  projects = [],
  pages = [],
  siteSettings,
  initialSessionHint = false,
}: any) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const navCloseTimer = useRef<number | null>(null);
  const menuAnchorRefs = useRef<Partial<Record<NonNullable<OpenMenu>, HTMLElement | null>>>({});
  const moreId = useId();

  const userRole = (session?.user as { role?: string } | undefined)?.role;
  const isScanner = userRole === 'SCANNER';
  const isTech = userRole === 'TECH';
  const isStaff = userRole === 'ADMIN' || userRole === 'MODERATOR';
  const [sessionHint, setSessionHint] = useState(() => Boolean(initialSessionHint));
  const [publicCode, setPublicCode] = useState<string | null>(null);
  const [navAvatar, setNavAvatar] = useState<string | null>(null);

  useLayoutEffect(() => {
    setSessionHint(readSessionHint());
  }, [status]);

  useEffect(() => {
    if (status === 'loading') return;
    persistSessionHint(status === 'authenticated' && Boolean(session));
  }, [status, session]);

  useEffect(() => {
    if (!session?.user?.id || isScanner) {
      setPublicCode(null);
      return;
    }
    let cancelled = false;
    fetchProfileCached()
      .then((data) => {
        if (cancelled) return;
        const code = typeof data?.publicCode === 'string' ? data.publicCode.trim() : '';
        setPublicCode(code || null);
        const img = typeof data?.image === 'string' ? data.image.trim() : '';
        setNavAvatar(img || null);
      })
      .catch(() => {
        if (!cancelled) setPublicCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isScanner]);

  const dashboardHref = isTech ? '/ops' : isScanner ? '/scanner' : '/dashboard';
  /** "Открыть профиль" → моя страница; кабинет/записи — /dashboard. */
  const profileHref = isTech ? '/ops' : isScanner ? '/scanner' : '/dashboard/me';

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname?.startsWith(path);
  };

  const getLinkStyle = (path: string, baseStyle: any = { fontWeight: 500 }) => ({
    ...baseStyle,
    color: isActive(path) ? 'var(--primary)' : 'inherit',
    fontWeight: isActive(path) ? 700 : baseStyle.fontWeight,
  });

  const toggleMenu = () => setIsMobileMenuOpen((open) => !open);
  const closeMenu = () => setIsMobileMenuOpen(false);
  const closeDesktopMenus = () => {
    if (navCloseTimer.current) {
      window.clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
    setOpenMenu(null);
  };
  const keepDesktopMenus = () => {
    if (navCloseTimer.current) {
      window.clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
  };
  const scheduleDesktopMenuClose = () => {
    keepDesktopMenus();
    navCloseTimer.current = window.setTimeout(() => {
      setOpenMenu(null);
      navCloseTimer.current = null;
    }, 400);
  };

  useEffect(() => {
    closeMenu();
    closeDesktopMenus();
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => () => keepDesktopMenus(), []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    document.body.classList.add('mobile-nav-open');
    document.documentElement.classList.add('mobile-nav-open');

    const root = mobileMenuRef.current;
    const focusableSel =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusables = () => {
      const fromMenu = root
        ? (Array.from(root.querySelectorAll(focusableSel)) as HTMLElement[]).filter(
            (el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
          )
        : [];
      const btn = menuButtonRef.current;
      if (btn && !fromMenu.includes(btn)) return [btn, ...fromMenu];
      return fromMenu;
    };

    window.requestAnimationFrame(() => {
      const items = getFocusables();
      (items[0] || menuButtonRef.current)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const items = getFocusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || (active && !root.contains(active))) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('mobile-nav-open');
      document.documentElement.classList.remove('mobile-nav-open');
      window.removeEventListener('keydown', onKey);
      menuButtonRef.current?.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDesktopMenus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (navRef.current?.contains(el)) return;
      if (el?.closest?.('[data-nav-dropdown]')) return;
      if (el?.closest?.('.nav-account')) return;
      closeDesktopMenus();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointer);
    };
  }, [openMenu]);

  const headerMainPages = pages.filter((p: any) => p.menuPosition === 'HEADER_MAIN');
  const headerSubPages = pages.filter(
    (p: any) =>
      p.menuPosition === 'HEADER_SUB' &&
      !isPrimaryHeaderSlug(String(p.slug || ''), String(p.title || ''))
  );
  const settingsHref = '/dashboard/settings';
  const cabinetLabel = isTech ? 'Ops' : isScanner ? 'Сканер' : 'Профиль';
  const cabinetHint = isTech ? 'Консоль площадки' : isScanner ? 'Сканирование QR' : 'Обзор и разделы';
  const settingsHint = 'Приватность и безопасность';

  const catalogTrigger = (
    id: 'projects' | 'clubs' | 'spaces',
    href: string,
    label: string,
    count: number
  ) => {
    const style = {
      ...getLinkStyle(href),
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      background: 'transparent',
      border: 0,
      padding: 0,
      font: 'inherit',
      cursor: 'pointer',
    } as const;
    if (count <= 0) {
      return (
        <Link href={href} data-nav-trigger={id} data-nav-anchor={id} style={style}>
          {label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        data-nav-trigger={id}
        data-nav-anchor={id}
        style={style}
        aria-expanded={openMenu === id}
        aria-haspopup="menu"
        onClick={() => setOpenMenu(id)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpenMenu(id);
          }
        }}
      >
        {label} <ChevronDown size={14} />
      </button>
    );
  };

  const renderDropdown = (
    id: Exclude<OpenMenu, null>,
    trigger: ReactNode,
    items: ReactNode,
    hasItems: boolean,
    menuDomId?: string
  ) => (
    <div
      className={`nav-item${openMenu === id ? ' is-open' : ''}`}
      data-nav-id={id === 'more' ? undefined : id}
      data-nav-menu={id}
      ref={(el) => {
        menuAnchorRefs.current[id] = el;
      }}
      onMouseEnter={() => {
        if (hasItems) {
          keepDesktopMenus();
          setOpenMenu(id);
        }
      }}
      onMouseLeave={scheduleDesktopMenuClose}
      onFocusCapture={() => {
        if (hasItems) setOpenMenu(id);
      }}
    >
      {trigger}
      <NavDropdownPortal
        open={Boolean(hasItems && openMenu === id)}
        align={id === 'more' ? 'end' : 'start'}
        id={menuDomId}
        getAnchor={() =>
          menuAnchorRefs.current[id]?.querySelector<HTMLElement>('[data-nav-anchor], button.nav-more-btn, button, a') ||
          document.querySelector<HTMLElement>(`[data-nav-menu="${id}"] [data-nav-anchor], [data-nav-menu="${id}"] button, [data-nav-menu="${id}"] a`)
        }
        onEnter={keepDesktopMenus}
        onLeave={scheduleDesktopMenuClose}
      >
        {items}
      </NavDropdownPortal>
    </div>
  );

  const renderSearch = (variant: 'desktop' | 'mobile') => (
    <div className={`nav-search nav-search--${variant}${searchOpen ? ' is-open' : ''}`}>
      {searchOpen ? (
        <form action="/search" method="GET" className="nav-search-form">
          <Search size={16} className="nav-search-icon" aria-hidden />
          <input
            ref={searchInputRef}
            id={variant === 'desktop' ? 'site-search-input' : undefined}
            type="search"
            name="q"
            placeholder="Поиск… (/)"
            className="nav-search-input"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setSearchOpen(false);
              }
            }}
          />
          <button
            type="button"
            className="nav-icon-btn nav-search-close"
            aria-label="Закрыть поиск"
            onClick={() => setSearchOpen(false)}
          >
            <X size={16} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="nav-icon-btn nav-search-trigger"
          aria-label={variant === 'desktop' ? 'Поиск по сайту' : 'Поиск'}
          title="Поиск (/)"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={18} />
        </button>
      )}
    </div>
  );

  // Guest links must stay visible during session resolve — never leave empty ghost placeholders.
  // Authenticated chrome after session OR first-paint yp-session hint (stops Запись from jumping).
  const onBookingFlow = Boolean(
    pathname === '/coworking' ||
      pathname?.startsWith('/coworking/') ||
      pathname?.includes('/book')
  );
  const isAuthenticated = status === 'authenticated' && Boolean(session);
  const showAuthedNav = isAuthenticated || (status === 'loading' && sessionHint);
  const authIconCount = showAuthedNav ? 2 : 3;

  const renderAuthIcons = () => (
    <div
      className="nav-auth-slot"
      style={{ ['--nav-auth-slots' as string]: authIconCount }}
    >
      {showAuthedNav ? null : (
      <div className="nav-auth-icons nav-auth-guest">
        {onBookingFlow ? null : (
        <GuestAuthPrompt
          href="/coworking"
          className="nav-pill nav-pill--solid nav-pill--desktop-cta"
          title="Запись в коворкинг"
          asButton
        >
          Коворкинг
        </GuestAuthPrompt>
        )}
        <Link href="/login" className="nav-pill nav-pill--ghost" title="Вход">
          Вход
        </Link>
        {modOn(siteSettings, 'registration') ? (
          <Link href="/register" className="nav-pill nav-pill--solid nav-pill--register" title="Регистрация">
            Регистрация
          </Link>
        ) : null}
      </div>
      )}
      <div className="nav-auth-icons nav-auth-icons--compact nav-auth-authed">
        {modOn(siteSettings, 'notifications') ? (
          <NotificationsBell compact useNavStyle />
        ) : (
          <span className="nav-icon-btn" aria-hidden />
        )}
        <div
          className={`nav-item nav-account${openMenu === 'account' ? ' is-open' : ''}`}
          data-nav-menu="account"
          ref={(el) => {
            menuAnchorRefs.current.account = el;
          }}
          onMouseEnter={() => {
            keepDesktopMenus();
            setOpenMenu('account');
          }}
          onMouseLeave={scheduleDesktopMenuClose}
        >
          <button
            type="button"
            className={`nav-icon-btn nav-account-trigger${navAvatar ? ' has-photo' : ''}`}
            data-nav-anchor="account"
            aria-expanded={openMenu === 'account'}
            aria-haspopup="menu"
            title="Аккаунт"
            aria-label="Аккаунт"
            onClick={() => setOpenMenu((m) => (m === 'account' ? null : 'account'))}
          >
            <UserAvatar
              name={(session?.user as { nickname?: string | null; name?: string | null } | undefined)?.nickname || session?.user?.name}
              image={navAvatar || session?.user?.image}
              size={40}
              framed={false}
            />
          </button>
            <NavDropdownPortal
              open={openMenu === 'account'}
              align="end"
              className="nav-account-menu"
              getAnchor={() =>
                menuAnchorRefs.current.account?.querySelector<HTMLElement>('[data-nav-anchor], button') ||
                document.querySelector<HTMLElement>('[data-nav-menu="account"] [data-nav-anchor]')
              }
              onEnter={keepDesktopMenus}
              onLeave={scheduleDesktopMenuClose}
            >
                <div className="nav-account-menu__head">
                  <strong>
                    {(session?.user as { nickname?: string | null } | undefined)?.nickname ||
                      session?.user?.name ||
                      'Аккаунт'}
                  </strong>
                  <span>{session?.user?.email}</span>
                </div>
                <Link href={profileHref} className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                  <UserCircle size={16} aria-hidden />
                  <span className="nav-account-menu__label">
                    <strong>Профиль</strong>
                    <small>Обзор и разделы</small>
                  </span>
                </Link>
                {!isScanner && !isTech ? (
                  <Link href="/dashboard/guides" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <BookOpen size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Инструктажи</strong>
                      <small>Как пользоваться порталом</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner && !isTech && modOn(siteSettings, 'achievements') ? (
                  <Link href="/dashboard/achievements" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <Award size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Достижения</strong>
                      <small>Значки и прогресс</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner && !isTech && modOn(siteSettings, 'eco') ? (
                  <Link href="/dashboard/shop" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <ShoppingBag size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Магазин</strong>
                      <small>М-баллы и оформление</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner && !isTech && modOn(siteSettings, 'friends') ? (
                  <Link href="/dashboard/friends" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <Users size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Друзья</strong>
                      <small>Заявки и список</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner && !isTech && modOn(siteSettings, 'messaging') ? (
                  <Link href="/dashboard/messages" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <MessageCircle size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Сообщения</strong>
                      <small>Личная переписка</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner ? (
                  <Link href="/dashboard/tickets" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <Ticket size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Билеты</strong>
                      <small>QR и записи</small>
                    </span>
                  </Link>
                ) : null}
                {!isScanner && !isTech ? (
                  <Link href={settingsHref} className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <Settings size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Настройки аккаунта</strong>
                      <small>{settingsHint}</small>
                    </span>
                  </Link>
                ) : null}
                {isStaff ? (
                  <Link href="/admin" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <Shield size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>Панель</strong>
                      <small>Администрирование</small>
                    </span>
                  </Link>
                ) : null}
                {isTech || isScanner ? (
                  <Link href={dashboardHref} className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>
                    <LayoutDashboard size={16} aria-hidden />
                    <span className="nav-account-menu__label">
                      <strong>{cabinetLabel}</strong>
                      <small>{cabinetHint}</small>
                    </span>
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="dropdown-item nav-account-menu__logout"
                  role="menuitem"
                  onClick={() => {
                    closeDesktopMenus();
                    void signOutLogged({ callbackUrl: '/' });
                  }}
                >
                  <LogOut size={16} aria-hidden /> Выйти
                </button>
            </NavDropdownPortal>
          </div>
        </div>
    </div>
  );


  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const nodes = Array.from(nav.querySelectorAll<HTMLElement>('[data-nav-id]'));
      nodes.forEach((n) => n.removeAttribute('data-nav-overflow'));
      const more = nav.querySelector<HTMLElement>('[data-nav-id="more"]');
      if (more) more.removeAttribute('data-nav-overflow');
      let used = 0;
      const gap = 14;
      const reserveMore = 72;
      const budget = Math.max(120, nav.clientWidth - reserveMore);
      const hidden: string[] = [];
      const keepVisible = new Set(['projects', 'clubs', 'spaces']);
      for (const node of nodes) {
        const id = node.dataset.navId || '';
        if (!id || id === 'more') continue;
        if (keepVisible.has(id)) {
          used += (node.getBoundingClientRect().width || 0) + gap;
          continue;
        }
        const w = node.getBoundingClientRect().width || 0;
        if (used + w + gap > budget) {
          node.setAttribute('data-nav-overflow', '1');
          hidden.push(id);
        } else {
          used += w + gap;
        }
      }
      setOverflowIds((prev) => (prev.join() === hidden.join() ? prev : hidden));
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    ro?.observe(nav);
    measure();
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [headerMainPages.length, projects.length, clubs.length, spaces.length]);

  /** Mobile: Запись + Вход for guests; profile icon when signed in. */
  const renderMobileHeaderActions = () => (
    <div className="nav-auth-mobile__row">
      {onBookingFlow || showAuthedNav ? null : (
      <GuestAuthPrompt
        href="/coworking"
        className="nav-pill nav-pill--solid nav-pill--mobile-cta"
        title="Запись в коворкинг"
        preferLink={false}
        asButton
      >
        Коворкинг
      </GuestAuthPrompt>
      )}
      {showAuthedNav ? null : (
        <Link href="/login" className="nav-pill nav-pill--ghost nav-pill--mobile-login" title="Вход">
          Вход
        </Link>
      )}
    </div>
  );


  const mobileDrawerKnownHrefs = new Set([
    '/projects',
    '/clubs',
    '/spaces',
    '/places',
    '/events',
    '/gallery',
    '/news',
    '/vacancies',
    '/contests',
    '/grants',
    '/dobro',
    '/self-gov',
    '/documents',
    '/games',
    '/contacts',
    '/p/about',
    '/about',
  ]);
  const showCmsInDrawer = (page: { slug?: string; title?: string }) => {
    const slug = String(page.slug || '').toLowerCase().replace(/_/g, '-');
    const href = publicPagePath(page.slug || "");
    const title = String(page.title || '').trim().toLowerCase();
    if (mobileDrawerKnownHrefs.has(href) || mobileDrawerKnownHrefs.has(`/${slug}`)) return false;
    if (
      [
        'grants', 'granty', 'grant', 'dobro', 'self-gov', 'self_gov', 'samoupravlenie',
        'documents', 'dokumenty', 'contacts', 'kontakty', 'about', 'o-nas', 'o_nas',
      ].includes(slug)
    ) {
      return false;
    }
    if (
      [
        'самоуправление', 'добро', 'гранты', 'грант', 'о нас', 'документы', 'контакты',
        'проекты', 'клубы', 'пространства', 'афиша', 'новости', 'игры', 'галерея',
      ].includes(title)
    ) {
      return false;
    }
    return true;
  };

  return (
    <header className={`glass-nav${isMobileMenuOpen ? ' menu-open' : ''}${searchOpen ? ' search-open' : ''}`}>
      <div className="container glass-nav-inner">
        <SiteBrand
          siteName={siteSettings?.siteName}
          logoUrl={siteSettings?.logoUrl}
          size="header"
          className="site-brand-nav"
        />

        <nav
          ref={navRef}
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'nowrap' }}
          className="desktop-nav"
          aria-label="Основное меню"
        >
          {headerMainPages
            .filter((page: any) => {
              const slug = String(page.slug || '').toLowerCase();
              // TZ: 4–6 primary links — keep About in the main row only
              return slug === 'about' || slug === 'o-nas' || page.title === 'О нас';
            })
            .map((page: any) => (
            <Link key={page.id} href={publicPagePath(page.slug || "")} data-nav-id={`page-${page.slug}`} style={getLinkStyle(publicPagePath(page.slug || ""))}>
              {page.title}
            </Link>
          ))}

          {modOn(siteSettings, 'projects')
            ? renderDropdown(
                'projects',
                catalogTrigger('projects', '/projects', 'Проекты', projects.length),
                <>
                  {projects.map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/projects/${encodeRouteParam(p.id)}`}
                      className="dropdown-item"
                      role="menuitem"
                      onClick={closeDesktopMenus}
                    >
                      {p.title}
                    </Link>
                  ))}
                  <Link
                    href="/projects"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={closeDesktopMenus}
                    style={{ borderTop: '1px solid #eee', fontWeight: 600, color: 'var(--primary)' }}
                  >
                    Все проекты &rarr;
                  </Link>
                </>,
                projects.length > 0
              )
            : null}

          {modOn(siteSettings, 'clubs')
            ? renderDropdown(
                'clubs',
                catalogTrigger('clubs', '/clubs', 'Клубы', clubs.length),
                <>
                  {clubs.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/clubs/${encodeRouteParam(c.id)}`}
                      className="dropdown-item"
                      role="menuitem"
                      onClick={closeDesktopMenus}
                    >
                      {c.title}
                    </Link>
                  ))}
                  <Link
                    href="/clubs"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={closeDesktopMenus}
                    style={{ borderTop: '1px solid #eee', fontWeight: 600, color: 'var(--primary)' }}
                  >
                    Все клубы &rarr;
                  </Link>
                </>,
                clubs.length > 0
              )
            : null}

          {modOn(siteSettings, 'spaces')
            ? renderDropdown(
                'spaces',
                catalogTrigger('spaces', '/spaces', 'Пространства', spaces.length),
                <>
                  {spaces.map((s: any) => (
                    <Link
                      key={s.id}
                      href={`/spaces/${encodeRouteParam(s.id)}`}
                      className="dropdown-item"
                      role="menuitem"
                      onClick={closeDesktopMenus}
                    >
                      {s.title}
                    </Link>
                  ))}
                  <Link
                    href="/spaces"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={closeDesktopMenus}
                    style={{ borderTop: '1px solid #eee', fontWeight: 600, color: 'var(--primary)' }}
                  >
                    Все пространства &rarr;
                  </Link>
                </>,
                spaces.length > 0
              )
            : null}

          {modOn(siteSettings, 'events') ? (
            <Link href="/events" data-nav-id="events" style={getLinkStyle('/events')}>
              Афиша
            </Link>
          ) : null}
          {modOn(siteSettings, 'news') ? (
            <Link href="/news" data-nav-id="news" style={getLinkStyle('/news')}>
              Новости
            </Link>
          ) : null}

          {renderDropdown(
              'more',
              <button
                type="button"
                id={moreId}
                className="nav-more-btn"
                data-nav-id="more"
                data-nav-anchor="more"
                style={{
                  cursor: 'pointer',
                  fontWeight: openMenu === 'more' ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'inherit',
                }}
                aria-expanded={openMenu === 'more'}
                aria-haspopup="menu"
                aria-controls={`${moreId}-menu`}
                onClick={() => setOpenMenu((m) => (m === 'more' ? null : 'more'))}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setOpenMenu('more');
                  }
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>Ещё <ChevronDown size={14} /></span>
              </button>,
              <>
                {(siteSettings?.galleryPageEnabled ?? true) && modOn(siteSettings, 'gallery') && (
                  <Link href="/gallery" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>Галерея</Link>
                )}
                {modOn(siteSettings, 'places') && (
                  <Link href="/places" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>Куда сходить</Link>
                )}
                {modOn(siteSettings, 'vacancies') && (
                  <Link href="/vacancies" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>Вакансии</Link>
                )}
                {modOn(siteSettings, 'contests') && (
                  <Link href="/contests" className="dropdown-item" role="menuitem" onClick={closeDesktopMenus}>Конкурсы</Link>
                )}
                {headerMainPages
                  .filter((page: any) => {
                    const slug = String(page.slug || '').toLowerCase();
                    return !(slug === 'about' || slug === 'o-nas' || page.title === 'О нас');
                  })
                  .map((page: any) => (
                    <Link
                      key={`more-${page.id}`}
                      href={publicPagePath(page.slug || "")}
                      className="dropdown-item"
                      role="menuitem"
                      onClick={closeDesktopMenus}
                    >
                      {page.title}
                    </Link>
                  ))}
                {headerSubPages.length > 0 && (
                  <div className="dropdown-section-label" role="presentation">
                    Ещё на сайте
                  </div>
                )}
                {headerSubPages.map((page: any) => (
                  <Link
                    key={page.id}
                    href={publicPagePath(page.slug || "")}
                    className="dropdown-item dropdown-item--page"
                    role="menuitem"
                    onClick={closeDesktopMenus}
                  >
                    {publicCmsTitle(page.slug, page.title)}
                  </Link>
                ))}
              </>,
              true,
              `${moreId}-menu`
            )}
        </nav>

        <div className="glass-nav-end">
          <div className="nav-search-desktop" aria-hidden={false}>
            {renderSearch('desktop')}
          </div>
          <div className="nav-header-mobile nav-header-mobile--compact" aria-hidden>
            {/* Search moves into burger menu on narrow screens to avoid logo crush */}
          </div>
          <div className="nav-auth-desktop">
            {renderAuthIcons()}
          </div>
          <div className="nav-auth-mobile" aria-label="Быстрые действия">
            {renderMobileHeaderActions()}
          </div>
          <button
            ref={menuButtonRef}
            className="mobile-menu-btn nav-icon-btn"
            onClick={toggleMenu}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {isMobileMenuOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Меню"
        >
          <nav className="mobile-menu__nav">
            <div className="mobile-menu__sheet-head">
              <h2 className="mobile-menu__sheet-title">Меню</h2>
              <div className="mobile-menu__sheet-tools">
                {session && !isScanner && !isTech && (
                  <Link
                    href={settingsHref}
                    className="mobile-menu__icon-btn"
                    aria-label="Настройки аккаунта"
                    title="Настройки аккаунта"
                    onClick={closeMenu}
                  >
                    <Settings size={20} />
                  </Link>
                )}
                {session && !isScanner && !isTech && modOn(siteSettings, 'notifications') ? (
                  <NotificationsBell compact useNavStyle />
                ) : null}
                {session ? (
                  <button
                    type="button"
                    className="mobile-menu__icon-btn"
                    aria-label="Выйти"
                    title="Выйти"
                    onClick={() => {
                      closeMenu();
                      void signOutLogged({ callbackUrl: '/' });
                    }}
                  >
                    <LogOut size={20} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mobile-menu__auth">
              <form action="/search" method="GET" className="mobile-menu__search" onSubmit={closeMenu}>
                <Search size={18} aria-hidden />
                <input type="search" name="q" placeholder="Поиск" enterKeyHint="search" aria-label="Поиск" />
              </form>
              {!isAuthenticated ? (
                <div className="mobile-menu__auth-guest">
                  <Link href="/login" onClick={closeMenu} className="mobile-menu__login btn btn-primary">
                    <User size={20} aria-hidden />
                    Вход
                  </Link>
                  {modOn(siteSettings, 'registration') ? (
                    <Link href="/register" onClick={closeMenu} className="mobile-menu__register btn btn-secondary">
                      Регистрация
                    </Link>
                  ) : null}
                </div>
              ) : (
                <NavProfileCard
                  variant="sheet"
                  href={profileHref}
                  fallbackName={
                    (session!.user as { nickname?: string | null })?.nickname || session!.user?.name
                  }
                  active={isMobileMenuOpen}
                  onNavigate={closeMenu}
                  ctaLabel={isTech ? 'Открыть Ops' : isScanner ? 'Открыть сканер' : 'Открыть профиль'}
                />
              )}
            </div>

            {session && !isScanner && !isTech && (
              <div className="mobile-menu__chips" aria-label="Кабинет">
                <Link href="/dashboard/notifications" onClick={closeMenu} className="mobile-menu__chip">
                  Уведомления
                </Link>
                <Link href="/dashboard/tickets" onClick={closeMenu} className="mobile-menu__chip">
                  Билеты
                </Link>
                <Link href="/dashboard/guides" onClick={closeMenu} className="mobile-menu__chip">
                  Инструктажи
                </Link>
                {modOn(siteSettings, 'achievements') ? (
                  <Link href="/dashboard/achievements" onClick={closeMenu} className="mobile-menu__chip">
                    Достижения
                  </Link>
                ) : null}
                {modOn(siteSettings, 'eco') ? (
                  <Link href="/dashboard/shop" onClick={closeMenu} className="mobile-menu__chip">
                    Магазин
                  </Link>
                ) : null}
                {isStaff ? (
                  <Link href="/admin" onClick={closeMenu} className="mobile-menu__chip">
                    Панель
                  </Link>
                ) : null}
              </div>
            )}
            {session && (isScanner || isTech) && (
              <div className="mobile-menu__chips" aria-label="Рабочее место">
                <Link href={dashboardHref} onClick={closeMenu} className="mobile-menu__chip">
                  {cabinetLabel}
                </Link>
              </div>
            )}

            <div className="mobile-menu__section-label">Разделы</div>
            <div className="mobile-menu__chips mobile-menu__chips--sections" aria-label="Разделы сайта">
              {headerMainPages.filter(showCmsInDrawer).map((page: any) => (
                <Link
                  key={page.id}
                  href={publicPagePath(page.slug || "")}
                  onClick={closeMenu}
                  className="mobile-menu__chip"
                  style={getLinkStyle(publicPagePath(page.slug || ""))}
                >
                  {page.title}
                </Link>
              ))}
              {modOn(siteSettings, 'projects') ? (
                <Link href="/projects" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/projects')}>
                  Проекты
                </Link>
              ) : null}
              {modOn(siteSettings, 'clubs') ? (
                <Link href="/clubs" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/clubs')}>
                  Клубы
                </Link>
              ) : null}
              {modOn(siteSettings, 'spaces') ? (
                <Link href="/spaces" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/spaces')}>
                  Пространства ЦРМ
                </Link>
              ) : null}
              {modOn(siteSettings, 'places') ? (
                <Link href="/places" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/places')}>
                  Куда сходить
                </Link>
              ) : null}
              {modOn(siteSettings, 'events') ? (
                <Link href="/events" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/events')}>
                  Афиша
                </Link>
              ) : null}
              {(siteSettings?.galleryPageEnabled ?? true) && modOn(siteSettings, 'gallery') ? (
                <Link href="/gallery" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/gallery')}>
                  Галерея
                </Link>
              ) : null}
              {modOn(siteSettings, 'news') ? (
                <Link href="/news" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/news')}>
                  Новости
                </Link>
              ) : null}
              {modOn(siteSettings, 'vacancies') ? (
                <Link href="/vacancies" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/vacancies')}>
                  Вакансии
                </Link>
              ) : null}
              {modOn(siteSettings, 'contests') ? (
                <Link href="/contests" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/contests')}>
                  Конкурсы
                </Link>
              ) : null}
              {modOn(siteSettings, 'grants') ? (
                <Link href="/grants" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/grants')}>
                  Гранты
                </Link>
              ) : null}
              {modOn(siteSettings, 'dobro') ? (
                <Link href="/dobro" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/dobro')}>
                  Добро
                </Link>
              ) : null}
              {modOn(siteSettings, 'self_gov') ? (
                <Link href="/self-gov" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/self-gov')}>
                  Самоуправление
                </Link>
              ) : null}
              {modOn(siteSettings, 'documents') ? (
                <Link href="/documents" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/documents')}>
                  Документы
                </Link>
              ) : null}
              {modOn(siteSettings, 'games') ? (
                <Link href="/games" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/games')}>
                  Игры
                </Link>
              ) : null}
              <Link href="/contacts" onClick={closeMenu} className="mobile-menu__chip" style={getLinkStyle('/contacts')}>
                Контакты
              </Link>
              {headerSubPages.filter(showCmsInDrawer).map((page: any) => (
                <Link
                  key={page.id}
                  href={publicPagePath(page.slug || "")}
                  onClick={closeMenu}
                  className="mobile-menu__chip"
                >
                  {publicCmsTitle(page.slug, page.title)}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
