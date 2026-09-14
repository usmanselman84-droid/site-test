'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Folder,
  Calendar,
  FileText,
  Settings,
  Clock,
  Newspaper,
  BarChart3,
  ScanLine,
  LogOut,
  ScrollText,
  FileStack,
  HandHeart,
  Briefcase,
  ShieldAlert,
  DatabaseBackup,
  MapPin,
  Trophy,
  Bot,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Menu,
  Shield,
  Server,
  Award,
  UsersRound,
  Home,
  UserCircle,
  CalendarRange,
  Search,
  Images,
} from 'lucide-react';
import { hasPermission, type ModeratorPermission } from '@/lib/acl-shared';
import NotificationsBell from '@/components/NotificationsBell';
import { signOutLogged } from '@/lib/sign-out-logged';
import {
  ADMIN_NAV_GROUP_LABELS,
  ADMIN_NAV_ITEMS,
  filterAdminNav,
  type AdminNavDef,
  type AdminNavGroup,
} from '@/lib/admin-nav';

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Users,
  UserPlus,
  Folder,
  Calendar,
  FileText,
  Settings,
  Clock,
  Newspaper,
  BarChart3,
  ScanLine,
  ScrollText,
  FileStack,
  HandHeart,
  Briefcase,
  ShieldAlert,
  DatabaseBackup,
  MapPin,
  Trophy,
  Bot,
  Activity,
  Shield,
  Server,
  Award,
  UsersRound,
  CalendarRange,
  Images,
};

const COLLAPSE_KEY = 'yp-admin-sidebar-collapsed';
const RECENT_KEY = 'yp-admin-nav-recent';

function canSee(item: AdminNavDef, userRole: string, userPermissions: string[]): boolean {
  if (userRole === 'ADMIN') return true;
  if (item.requiredPermission === 'ADMIN_ONLY') return false;
  if (!item.requiredPermission) return true;
  const raw = userPermissions.join(',');
  return hasPermission(
    'MODERATOR',
    raw,
    item.requiredPermission as ModeratorPermission | ModeratorPermission[]
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatBadge(n: number) {
  if (n <= 0) return null;
  return n > 999 ? '999+' : String(n);
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecent(href: string) {
  try {
    const next = [href, ...readRecent().filter((x) => x !== href)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export default function AdminSidebar({
  userRole,
  userPermissions,
}: {
  userRole: string;
  userPermissions: string[];
}) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const drawerSearchRef = useRef<HTMLInputElement | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [navQuery, setNavQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
      setRecent(readRecent());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    pushRecent(pathname.startsWith('/admin') ? pathname.replace(/\/+$/, '') || '/admin' : pathname);
    setRecent(readRecent());
  }, [pathname]);

  useEffect(() => {
    if (drawerOpen) return;
    const drawer = document.getElementById('admin-nav-drawer');
    const el = document.activeElement as HTMLElement | null;
    if (el && drawer?.contains(el)) el.blur();
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => drawerSearchRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [drawerOpen]);

  const visible = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => canSee(item, userRole, userPermissions)),
    [userRole, userPermissions]
  );

  const filtered = useMemo(() => filterAdminNav(visible, navQuery), [visible, navQuery]);
  const searching = Boolean(navQuery.trim());

  useEffect(() => {
    setActiveIndex(0);
  }, [navQuery, drawerOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 899px)').matches) {
          setDrawerOpen(true);
        } else {
          searchRef.current?.focus();
        }
        return;
      }
      if (!typing && e.key === '/') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 899px)').matches) setDrawerOpen(true);
        else searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetch('/api/admin/nav-counts')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.counts) return;
          setCounts(d.counts as Record<string, number>);
        })
        .catch(() => undefined);
    };
    load();
    const t = setInterval(load, 180000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const toggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const badgeFor = (item: AdminNavDef) => {
    if (!item.badgeKey) return null;
    return formatBadge(counts[item.badgeKey] || 0);
  };

  const go = (href: string) => {
    pushRecent(href);
    setDrawerOpen(false);
    router.push(href);
  };

  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = filtered[activeIndex] || filtered[0];
      if (hit) go(hit.href);
    }
  };

  const renderCards = (opts: { iconOnly: boolean; idPrefix: string }) => {
    const groups: AdminNavGroup[] = ['main', 'content', 'ops', 'system'];
    return (
      <nav
        className={`admin-nav-board${opts.iconOnly ? ' is-icons' : ''}`}
        aria-label="Разделы панели"
      >
        {searching ? (
          <p className="admin-nav-board__status">
            {filtered.length ? `${filtered.length} раздел(а)` : 'Ничего не найдено — смените запрос'}
          </p>
        ) : null}
        {searching ? (
          <div className="admin-nav-board__grid">
            {filtered.map((item, i) => renderCard(item, opts.idPrefix, i, opts.iconOnly))}
          </div>
        ) : (
          groups.map((group) => {
            const groupItems = filtered.filter((i) => i.group === group);
            if (!groupItems.length) return null;
            return (
              <div key={group} className="admin-nav-board__group">
                {opts.iconOnly ? null : <p className="admin-nav-board__label">{ADMIN_NAV_GROUP_LABELS[group]}</p>}
                <div className="admin-nav-board__grid">
                  {groupItems.map((item) => renderCard(item, opts.idPrefix, filtered.indexOf(item), opts.iconOnly))}
                </div>
              </div>
            );
          })
        )}
      </nav>
    );
  };

  const renderCard = (item: AdminNavDef, idPrefix: string, index: number, iconOnly: boolean) => {
    const Icon = ICONS[item.icon] || LayoutDashboard;
    const active = isActivePath(pathname, item.href);
    const badge = badgeFor(item);
    const hot = searching && index === activeIndex;
    return (
      <Link
        key={`${idPrefix}-${item.href}`}
        href={item.href}
        className={`admin-nav-card${active ? ' is-active' : ''}${hot ? ' is-hot' : ''}${iconOnly ? ' is-icon' : ''}`}
        aria-current={active ? 'page' : undefined}
        title={`${item.label} — ${item.hint}`}
        onClick={() => setDrawerOpen(false)}
      >
        <span className="admin-nav-card__icon">
          <Icon size={15} />
        </span>
        {iconOnly ? (
          badge ? <span className="admin-nav-card__dot" aria-label={badge} /> : null
        ) : (
          <>
            <span className="admin-nav-card__copy">
              <strong>{item.label}</strong>
            </span>
            {badge ? <span className="admin-nav-card__badge">{badge}</span> : null}
          </>
        )}
      </Link>
    );
  };

  const searchField = (ref: typeof searchRef, id: string) => (
    <div className="samsung-sidebar__search admin-nav-search">
      <Search size={15} aria-hidden />
      <input
        ref={ref}
        id={id}
        value={navQuery}
        onChange={(e) => setNavQuery(e.target.value)}
        onKeyDown={onSearchKey}
        placeholder="Раздел, синоним или /admin/…"
        aria-label="Быстрый поиск по панели"
        autoComplete="off"
        spellCheck={false}
      />
      {navQuery ? (
        <button type="button" className="admin-nav-search__clear" onClick={() => setNavQuery('')} aria-label="Очистить поиск">
          <X size={14} />
        </button>
      ) : (
        <kbd className="admin-nav-search__kbd">/</kbd>
      )}
    </div>
  );

  const foot = (iconOnly: boolean) => (
    <div className={`admin-nav-foot${iconOnly ? ' is-icons' : ''}`}>
      <Link href="/" className="admin-nav-foot__btn" title="На главную сайта" onClick={() => setDrawerOpen(false)}>
        <Home size={16} />
        {iconOnly ? null : <span>Сайт</span>}
      </Link>
      <Link href="/dashboard" className="admin-nav-foot__btn" title="Профиль" onClick={() => setDrawerOpen(false)}>
        <UserCircle size={16} />
        {iconOnly ? null : <span>Профиль</span>}
      </Link>
      <button type="button" className="admin-nav-foot__btn" title="Выйти" onClick={() => void signOutLogged({ callbackUrl: '/' })}>
        <LogOut size={16} />
        {iconOnly ? null : <span>Выйти</span>}
      </button>
    </div>
  );

  return (
    <>
      <div className="admin-mobile-bar">
        <button
          type="button"
          className="admin-mobile-bar__menu"
          aria-label="Открыть панель разделов"
          aria-expanded={drawerOpen}
          aria-controls="admin-nav-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={18} />
        </button>
        <div className="admin-mobile-bar__meta">
          <strong>Панель</strong>
          <span>Разделы</span>
        </div>
        <div className="admin-mobile-bar__actions">
          <Link href="/" className="admin-mobile-bar__icon" title="На сайт" aria-label="На сайт">
            <Home size={18} />
          </Link>
          <NotificationsBell compact useNavStyle />
        </div>
      </div>

      <aside
        className={`samsung-sidebar${collapsed ? ' is-collapsed' : ''}`}
        data-collapsed={collapsed ? '1' : '0'}
        aria-label="Навигация панели"
      >
        <div className="samsung-sidebar__head">
          {!collapsed ? (
            <Link href="/admin" className="samsung-sidebar__title" title="Обзор панели">
              Панель управления
            </Link>
          ) : (
            <Link href="/" className="samsung-sidebar__home-collapsed" title="Главная" aria-label="Главная">
              <Home size={18} />
            </Link>
          )}
          <div className="samsung-sidebar__head-actions">
            {!collapsed ? <NotificationsBell compact useNavStyle /> : null}
            <button
              type="button"
              className="samsung-sidebar__collapse"
              aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
              title={collapsed ? 'Развернуть' : 'Свернуть'}
              onClick={toggleCollapse}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
        {!collapsed ? searchField(searchRef, 'admin-nav-search-desk') : null}
        {renderCards({ iconOnly: collapsed, idPrefix: 'desk' })}
        {foot(collapsed)}
      </aside>

      {portalReady
        ? createPortal(
            <div
              id="admin-nav-drawer"
              className={`samsung-drawer${drawerOpen ? ' is-open' : ''}`}
              aria-hidden={!drawerOpen}
              hidden={!drawerOpen}
            >
              <button
                type="button"
                className="samsung-drawer__backdrop"
                aria-label="Закрыть меню"
                tabIndex={drawerOpen ? 0 : -1}
                onClick={() => setDrawerOpen(false)}
              />
              <div className="samsung-drawer__panel" role="dialog" aria-modal="true" aria-label="Карточная панель">
                <div className="samsung-drawer__head">
          <strong>Панель</strong>
                  <div className="samsung-drawer__head-actions">
                    <Link href="/" aria-label="Главная" title="Главная" onClick={() => setDrawerOpen(false)}>
                      <Home size={18} />
                    </Link>
                    <button type="button" aria-label="Закрыть" onClick={() => setDrawerOpen(false)}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
                {searchField(drawerSearchRef, 'admin-nav-search-drawer')}
                <div className="samsung-drawer__nav-scroll">
                  {renderCards({ iconOnly: false, idPrefix: 'drawer' })}
                  {foot(false)}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
