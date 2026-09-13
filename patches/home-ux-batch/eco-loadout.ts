/** Client-safe eco cosmetics metadata (no Prisma). */

export type CosmeticSlot =
  | 'frame'
  | 'badge'
  | 'theme'
  | 'ticket'
  | 'voice'
  | 'aura'
  | 'banner'
  | 'cursor';

export type EcoBoostId = 'spotlight' | 'gold_name' | 'extra_slots';

export type EcoBoosts = Partial<Record<EcoBoostId, string>>;

export const ECO_BOOSTS: Record<
  EcoBoostId,
  { id: EcoBoostId; cost: number; hours: number; label: string; blurb: string }
> = {
  spotlight: {
    id: 'spotlight',
    cost: 90,
    hours: 24,
    label: 'Витрина на 24 часа',
    blurb: 'Профиль подсвечивается, вас проще заметить в ленте и поиске.',
  },
  gold_name: {
    id: 'gold_name',
    cost: 75,
    hours: 72,
    label: 'Золотое имя на 3 дня',
    blurb: 'Имя в кабинете и на карточке — золотым акцентом.',
  },
  extra_slots: {
    id: 'extra_slots',
    cost: 60,
    hours: 168,
    label: 'Витрина +2 значка на неделю',
    blurb: 'Можно закрепить до пяти значков вместо трёх.',
  },
};

export type EcoLoadout = {
  voice?: string | null;
  frame?: string | null;
  badge?: string | null;
  theme?: string | null;
  ticket?: string | null;
  aura?: string | null;
  banner?: string | null;
  cursor?: string | null;
  boosts?: EcoBoosts;
};

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  voice: 'Стиль текстов (голос UI)',
  frame: 'Рамка',
  badge: 'Значок',
  theme: 'Тема профиля',
  ticket: 'Билет',
  aura: 'Аура аватара',
  banner: 'Шапка профиля',
  cursor: 'Курсор',
};

/** What each cosmetic slot actually changes for the user */
export const SLOT_HINTS: Record<CosmeticSlot, string> = {
  voice:
    'Не микрофон и не озвучка. Меняет текст кнопок и подписей в играх и кабинете (молодёжный, панк, сочинский). После надевания обновите страницу кабинета — формулировки подхватятся.',
  frame: 'Цветная обводка вокруг аватара в профиле, чатах и поиске. Сразу видно на карточке «Как видят профиль».',
  badge: 'Маленький значок у имени и аватара. На телефоне он тоже есть.',
  theme: 'Цвета фона и акцентов публичной карточки профиля (не всего сайта).',
  ticket: 'Оформление QR-билета в кабинете → Билеты. Гость на входе увидит вашу рамку билета.',
  aura: 'Свечение вокруг фото. Работает на странице профиля и в кабинете.',
  banner: 'Широкая шапка над аватаром в профиле. На узком экране шапка короче, но цвет тот же.',
  cursor: 'Заменяет курсор мыши на всём сайте. На телефоне и планшете без мыши эффекта нет — это нормально.',
};

export const LOADOUT_SLOTS: CosmeticSlot[] = [
  'voice',
  'frame',
  'badge',
  'theme',
  'ticket',
  'aura',
  'banner',
  'cursor',
];

/** Short glyphs for shop previews + equipped strip */
export const COSMETIC_PREVIEW: Record<
  string,
  { glyph: string; tint: string; label?: string }
> = {
  frame_ocean: { glyph: '🌊', tint: '#0ea5e9', label: 'Океан' },
  frame_forest: { glyph: '🌲', tint: '#16a34a', label: 'Лес' },
  frame_gold: { glyph: '✦', tint: '#eab308', label: 'Золото' },
  frame_neon: { glyph: '◈', tint: '#22d3ee', label: 'Неон' },
  frame_cyber: { glyph: '▣', tint: '#a855f7', label: 'Кибер' },
  frame_pearl: { glyph: '◇', tint: '#e2e8f0', label: 'Жемчуг' },
  badge_leaf: { glyph: '🍃', tint: '#16a34a', label: 'Лист' },
  badge_star: { glyph: '⭐', tint: '#eab308', label: 'Звезда' },
  badge_wave: { glyph: '🌊', tint: '#0ea5e9', label: 'Волна' },
  badge_fire: { glyph: '🔥', tint: '#f97316', label: 'Огонь' },
  badge_compass: { glyph: '🧭', tint: '#0284c7', label: 'Компас' },
  theme_aurora: { glyph: '🌌', tint: '#8b5cf6', label: 'Сияние' },
  theme_forest: { glyph: '🌿', tint: '#16a34a', label: 'Чаща' },
  theme_nightcity: { glyph: '🌃', tint: '#1e293b', label: 'Ночной город' },
  theme_harbor: { glyph: '⚓', tint: '#0d9488', label: 'Гавань' },
  theme_lagoon: { glyph: '🏝', tint: '#2dd4bf', label: 'Лагуна' },
  ticket_glow: { glyph: '▣', tint: '#0d9488', label: 'Свечение' },
  ticket_holo: { glyph: '✦', tint: '#a855f7', label: 'Голограмма' },
  ticket_pulse: { glyph: '◉', tint: '#14b8a6', label: 'Пульс' },
  voice_slavonic: { glyph: '♪', tint: '#78716c', label: 'Славянский' },
  voice_punk: { glyph: '♫', tint: '#e11d48', label: 'Панк' },
  voice_elite: { glyph: '♬', tint: '#a16207', label: 'Элита' },
  voice_sochi: { glyph: '♪', tint: '#0ea5e9', label: 'Сочи' },
  voice_youth: { glyph: '♩', tint: '#db2777', label: 'Молодёжный' },
  aura_spark: { glyph: '✨', tint: '#22c55e', label: 'Искры' },
  aura_wave: { glyph: '〰️', tint: '#06b6d4', label: 'Волна' },
  aura_ember: { glyph: '🔥', tint: '#ea580c', label: 'Угли' },
  banner_sunset: { glyph: '🌅', tint: '#fb923c', label: 'Закат' },
  banner_sochi: { glyph: '🏖', tint: '#0d9488', label: 'Сочи' },
  banner_palms: { glyph: '🌴', tint: '#22c55e', label: 'Пальмы' },
  cursor_leaf: { glyph: '➜', tint: '#16a34a', label: 'Лист' },
  cursor_star: { glyph: '➜', tint: '#eab308', label: 'Звезда' },
  cursor_wave: { glyph: '〰', tint: '#06b6d4', label: 'Волна' },
  cursor_lime: { glyph: '➜', tint: '#afca03', label: 'Лайм' },
  cursor_neon: { glyph: '✦', tint: '#a855f7', label: 'Неон' },
  cursor_palm: { glyph: '🌴', tint: '#15803d', label: 'Пальма' },
  aura_neon: { glyph: '💜', tint: '#a855f7', label: 'Неон' },
  aura_gold: { glyph: '✨', tint: '#eab308', label: 'Золото' },
  banner_night: { glyph: '🌃', tint: '#1e293b', label: 'Ночь' },
  banner_harbor: { glyph: '⚓', tint: '#0d9488', label: 'Гавань' },
  frame_lime: { glyph: '▣', tint: '#afca03', label: 'Лайм' },
  frame_ink: { glyph: '▣', tint: '#0a0c2a', label: 'Чернила' },
  badge_sun: { glyph: '☀', tint: '#f59e0b', label: 'Солнце' },
  theme_arena: { glyph: '🏟', tint: '#db2777', label: 'Арена' },
  ticket_sochi: { glyph: '🎫', tint: '#0ea5e9', label: 'Сочи' },
  frame_sunset: { glyph: '🌇', tint: '#f97316', label: 'Закат' },
  badge_anchor: { glyph: '⚓', tint: '#0f766e', label: 'Якорь' },
  theme_marble: { glyph: '🏛', tint: '#78716c', label: 'Мрамор' },
  aura_mist: { glyph: '🌫', tint: '#94a3b8', label: 'Туман' },
};

export function activeBoosts(loadout: EcoLoadout, now = Date.now()): EcoBoosts {
  const out: EcoBoosts = {};
  const src = loadout.boosts || {};
  for (const key of Object.keys(src) as EcoBoostId[]) {
    const iso = src[key];
    if (!iso) continue;
    const t = Date.parse(iso);
    if (Number.isFinite(t) && t > now) out[key] = iso;
  }
  return out;
}

export function parseEcoLoadout(raw: unknown): EcoLoadout {
  if (!raw) return {};
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object') return {};
    const out: EcoLoadout = {};
    for (const slot of LOADOUT_SLOTS) {
      const v = (data as Record<string, unknown>)[slot];
      if (typeof v === 'string' && v.trim()) out[slot] = v.trim().slice(0, 64);
    }
    const rawBoosts = (data as { boosts?: unknown }).boosts;
    if (rawBoosts && typeof rawBoosts === 'object') {
      const boosts: EcoBoosts = {};
      for (const key of ['spotlight', 'gold_name', 'extra_slots'] as EcoBoostId[]) {
        const v = (rawBoosts as Record<string, unknown>)[key];
        if (typeof v === 'string' && Date.parse(v)) boosts[key] = v;
      }
      if (Object.keys(boosts).length) out.boosts = boosts;
    }
    return out;
  } catch {
    return {};
  }
}

export type EcoDomAttrs = {
  'data-voice'?: string;
  'data-eco-cursor'?: string;
  'data-eco-aura'?: string;
  'data-eco-banner'?: string;
  'data-eco-frame'?: string;
  'data-eco-badge'?: string;
  'data-eco-theme'?: string;
  'data-eco-ticket'?: string;
  'data-eco-spotlight'?: string;
  'data-eco-goldname'?: string;
  'data-eco-extraslots'?: string;
};

/** Map loadout → DOM data-* used by CSS (owner html or public .yp-eco-surface). */
export function ecoLoadoutToDomAttrs(loadout: EcoLoadout): EcoDomAttrs {
  const attrs: EcoDomAttrs = {};

  if (loadout.voice) attrs['data-voice'] = loadout.voice;

  if (loadout.cursor) attrs['data-eco-cursor'] = loadout.cursor.replace(/^cursor_/, '');
  if (loadout.aura) attrs['data-eco-aura'] = loadout.aura.replace(/^aura_/, '');
  if (loadout.banner) attrs['data-eco-banner'] = loadout.banner.replace(/^banner_/, '');

  if (loadout.frame) attrs['data-eco-frame'] = loadout.frame;
  if (loadout.badge) attrs['data-eco-badge'] = loadout.badge;
  if (loadout.theme) attrs['data-eco-theme'] = loadout.theme;
  if (loadout.ticket) attrs['data-eco-ticket'] = loadout.ticket;

  const live = activeBoosts(loadout);
  if (live.spotlight) attrs['data-eco-spotlight'] = '1';
  if (live.gold_name) attrs['data-eco-goldname'] = '1';
  if (live.extra_slots) attrs['data-eco-extraslots'] = '5';

  return attrs;
}

const ECO_ATTR_KEYS = [
  'data-voice',
  'data-eco-cursor',
  'data-eco-aura',
  'data-eco-banner',
  'data-eco-frame',
  'data-eco-badge',
  'data-eco-theme',
  'data-eco-ticket',
  'data-eco-spotlight',
  'data-eco-goldname',
  'data-eco-extraslots',
] as const;

export function applyEcoDomEffects(target: HTMLElement, loadout: EcoLoadout) {
  const next = ecoLoadoutToDomAttrs(loadout);
  let changed = false;
  for (const key of ECO_ATTR_KEYS) {
    const val = next[key];
    const prev = target.getAttribute(key);
    if (val) {
      if (prev !== val) {
        target.setAttribute(key, val);
        changed = true;
      }
    } else if (prev != null) {
      target.removeAttribute(key);
      changed = true;
    }
  }
  return changed;
}

/** Map shop frame id → avatar ring colors (public profile / UserAvatar). */
export function shopFrameStyle(frameId: string | null | undefined): {
  border: string;
  glow: string;
} | null {
  if (!frameId) return null;
  const map: Record<string, { border: string; glow: string }> = {
    frame_ocean: { border: '#0ea5e9', glow: 'rgba(14,165,233,0.45)' },
    frame_forest: { border: '#16a34a', glow: 'rgba(22,163,74,0.4)' },
    frame_gold: { border: '#eab308', glow: 'rgba(234,179,8,0.5)' },
    frame_neon: { border: '#22d3ee', glow: 'rgba(34,211,238,0.55)' },
    frame_cyber: { border: '#a855f7', glow: 'rgba(168,85,247,0.5)' },
    frame_pearl: { border: '#e2e8f0', glow: 'rgba(226,232,240,0.7)' },
    frame_sunset: { border: '#f97316', glow: 'rgba(249,115,22,0.45)' },
    frame_lime: { border: '#afca03', glow: 'rgba(175,202,3,0.5)' },
    frame_ink: { border: '#0a0c2a', glow: 'rgba(10,12,42,0.45)' },
  };
  return map[frameId] || null;
}

/** Equipped items for the hero “надето” strip */
export function equippedLoadoutItems(loadout: EcoLoadout) {
  const items: { slot: CosmeticSlot; id: string; glyph: string; tint: string; label: string }[] =
    [];
  for (const slot of LOADOUT_SLOTS) {
    const id = loadout[slot];
    if (!id) continue;
    const preview = COSMETIC_PREVIEW[id] || { glyph: '◈', tint: '#0d9488' };
    items.push({
      slot,
      id,
      glyph: preview.glyph,
      tint: preview.tint,
      label: preview.label ? `${SLOT_LABELS[slot]}: ${preview.label}` : SLOT_LABELS[slot],
    });
  }
  return items;
}
