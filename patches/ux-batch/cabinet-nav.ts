export type CabinetNavId =
  | 'overview'
  | 'mypage'
  | 'settings'
  | 'showcase'
  | 'friends'
  | 'messages'
  | 'tickets'
  | 'applications'
  | 'portfolio'
  | 'referrals'
  | 'guides'
  | 'games'
  | 'shop'
  | 'achievements'
  | 'awards'
  | 'notifications';

export type CabinetHubId = 'page' | 'social' | 'tasks' | 'progress';

export type CabinetNavItem = {
  id: CabinetNavId;
  label: string;
  href: string;
  module?: string;
};

export type CabinetNavHub = {
  id: CabinetHubId;
  label: string;
  href: string;
  items: CabinetNavItem[];
};

/** 4 хаба (закон Миллера). Настройки — только в меню аватара. */
export const CABINET_HUBS: CabinetNavHub[] = [
  {
    id: 'page',
    label: 'Страница',
    href: '/dashboard/me',
    items: [
      { id: 'overview', label: 'Мои записи', href: '/dashboard' },
      { id: 'mypage', label: 'Моя страница', href: '/dashboard/me' },
      { id: 'settings', label: 'Настройки', href: '/dashboard/settings' },
      { id: 'showcase', label: 'Витрина', href: '/dashboard/showcase' },
      { id: 'portfolio', label: 'Портфолио', href: '/dashboard/portfolio', module: 'portfolio' },
      { id: 'referrals', label: 'Рефералы', href: '/dashboard/referrals', module: 'referrals' },
    ],
  },
  {
    id: 'social',
    label: 'Общение',
    href: '/dashboard/messages',
    items: [
      { id: 'messages', label: 'Сообщения', href: '/dashboard/messages', module: 'messaging' },
      { id: 'notifications', label: 'Уведомления', href: '/dashboard/notifications', module: 'notifications' },
      { id: 'friends', label: 'Друзья', href: '/dashboard/friends', module: 'friends' },
    ],
  },
  {
    id: 'tasks',
    label: 'Дела',
    href: '/dashboard/tickets',
    items: [
      { id: 'tickets', label: 'Билеты', href: '/dashboard/tickets', module: 'events' },
      { id: 'applications', label: 'Заявки', href: '/dashboard/applications', module: 'applications' },
      { id: 'guides', label: 'Инструктажи', href: '/dashboard/guides' },
    ],
  },
  {
    id: 'progress',
    label: 'Прогресс',
    href: '/dashboard/shop',
    items: [
      { id: 'achievements', label: 'Достижения', href: '/dashboard/achievements', module: 'achievements' },
      { id: 'awards', label: 'Награды', href: '/dashboard/awards', module: 'achievements' },
      { id: 'games', label: 'Игры', href: '/dashboard/games', module: 'games' },
      { id: 'shop', label: 'Магазин', href: '/dashboard/shop', module: 'eco' },
    ],
  },
];

export function cabinetNavIdFromPath(pathname: string): CabinetNavId {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/dashboard/me' || p.endsWith('/dashboard/me')) return 'mypage';
  if (p === '/dashboard') return 'overview';
  if (p.startsWith('/dashboard/settings') || p.startsWith('/profile')) return 'settings';
  if (p.startsWith('/dashboard/showcase')) return 'showcase';
  if (p.startsWith('/dashboard/applications')) return 'applications';
  if (p.startsWith('/dashboard/portfolio')) return 'portfolio';
  if (p.startsWith('/dashboard/referrals')) return 'referrals';
  if (p.startsWith('/dashboard/guides') || p.startsWith('/dashboard/briefings')) return 'guides';
  if (p.startsWith('/dashboard/games')) return 'games';
  if (p.startsWith('/dashboard/shop')) return 'shop';
  if (p.startsWith('/dashboard/achievements')) return 'achievements';
  if (p.startsWith('/dashboard/awards') || p.startsWith('/dashboard/rewards')) return 'awards';
  if (p.startsWith('/dashboard/notifications')) return 'notifications';
  if (p.startsWith('/dashboard/friends') || p.startsWith('/friends')) return 'friends';
  if (p.startsWith('/dashboard/messages') || p.startsWith('/messages')) return 'messages';
  if (p.startsWith('/dashboard/tickets') || p.startsWith('/tickets')) return 'tickets';
  return 'overview';
}

export function cabinetHubFromPath(pathname: string): CabinetHubId {
  const id = cabinetNavIdFromPath(pathname);
  const hub = CABINET_HUBS.find((h) => h.items.some((item) => item.id === id));
  return hub?.id || 'page';
}

/** @deprecated use CABINET_HUBS */
export const CABINET_NAV = CABINET_HUBS.map((hub) => ({
  group: hub.label,
  items: hub.items,
}));
