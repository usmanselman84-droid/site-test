/**
 * Private anti-bot: proof-of-work + picture pick + honeypot + single-use token.
 * Challenge is kept until solved (failed attempts do not wipe it).
 */
import crypto from 'crypto';
import sharp from 'sharp';
import { getSharedRedis } from '@/lib/rateLimit';

const TTL_SEC = 420;
const POW_ZEROS = 3;
const MEM = new Map<string, { payload: string; exp: number }>();

function requireHmacSecret(fallbackDevOnly: string): string {
  const s =
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required');
  }
  return fallbackDevOnly;
}

function secret() {
  return requireHmacSecret('yp-captcha-dev');
}

function cleanupMem() {
  const now = Date.now();
  for (const [k, v] of MEM) {
    if (v.exp < now) MEM.delete(k);
  }
}

export type CaptchaTilePublic = { id: string; src: string };

export type CaptchaChallenge = {
  challengeId: string;
  question: string;
  kind: 'pick' | 'math';
  tiles?: CaptchaTilePublic[];
  pow: { seed: string; zeros: number };
};

const PICK_TARGETS = [
  { tag: 'wave', title: 'волны' },
  { tag: 'palm', title: 'пальмы' },
  { tag: 'skate', title: 'скейты' },
  { tag: 'sun', title: 'солнце' },
  { tag: 'note', title: 'музыку' },
] as const;

type TileTag = (typeof PICK_TARGETS)[number]['tag'];

type StoredTile = { id: string; tag: TileTag; seed: number };
type StoredChallenge = {
  answer: string;
  tiles: StoredTile[];
  powSeed: string;
  zeros: number;
  createdAt: number;
  attempts: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function storeRaw(key: string, value: string, ttl = TTL_SEC) {
  const redis = getSharedRedis();
  if (redis) {
    await redis.set(key, value, 'EX', ttl);
  } else {
    MEM.set(key, { payload: value, exp: Date.now() + ttl * 1000 });
  }
}

async function loadRaw(key: string): Promise<string | null> {
  const redis = getSharedRedis();
  if (redis) {
    const stored = await redis.get(key);
    return stored != null ? String(stored) : null;
  }
  cleanupMem();
  const row = MEM.get(key);
  if (!row || row.exp < Date.now()) {
    MEM.delete(key);
    return null;
  }
  return row.payload;
}

async function delRaw(key: string) {
  const redis = getSharedRedis();
  if (redis) await redis.del(key);
  else MEM.delete(key);
}

function parseStored(raw: string | null): StoredChallenge | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredChallenge;
    if (parsed?.answer && Array.isArray(parsed.tiles)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function sha256hex(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function powOk(challengeId: string, seed: string, zeros: number, nonce: string) {
  if (!nonce || nonce.length > 32) return false;
  const hex = sha256hex(`${challengeId}:${seed}:${nonce}`);
  return hex.startsWith('0'.repeat(Math.max(1, Math.min(6, zeros))));
}

export async function createCaptchaChallenge(): Promise<CaptchaChallenge> {
  cleanupMem();
  const challengeId = crypto.randomBytes(16).toString('hex');
  const powSeed = crypto.randomBytes(8).toString('hex');
  const target = PICK_TARGETS[Math.floor(Math.random() * PICK_TARGETS.length)];
  const hits: StoredTile[] = Array.from({ length: 3 }, () => ({
    id: crypto.randomBytes(8).toString('hex'),
    tag: target.tag,
    seed: crypto.randomInt(1, 9999),
  }));
  const others = PICK_TARGETS.filter((t) => t.tag !== target.tag).map((t) => t.tag);
  const decoys: StoredTile[] = Array.from({ length: 6 }, (_, i) => ({
    id: crypto.randomBytes(8).toString('hex'),
    tag: others[i % others.length],
    seed: crypto.randomInt(1, 9999),
  }));
  const tiles = shuffle([...hits, ...decoys]);
  const correct = tiles
    .filter((t) => t.tag === target.tag)
    .map((t) => t.id)
    .sort()
    .join(',');
  const stored: StoredChallenge = {
    answer: `pick:${correct}`,
    tiles,
    powSeed,
    zeros: POW_ZEROS,
    createdAt: Date.now(),
    attempts: 0,
  };
  await storeRaw(`captcha:${challengeId}`, JSON.stringify(stored));
  return {
    challengeId,
    question: `Отметьте все картинки: ${target.title}`,
    kind: 'pick',
    tiles: tiles.map((t) => ({
      id: t.id,
      src: `/api/captcha/tile/${challengeId}/${t.id}`,
    })),
    pow: { seed: powSeed, zeros: POW_ZEROS },
  };
}

export async function renderCaptchaTilePng(challengeId: string, tileId: string): Promise<Buffer | null> {
  const stored = parseStored(await loadRaw(`captcha:${challengeId}`));
  const tile = stored?.tiles.find((t) => t.id === tileId);
  if (!tile) return null;
  const svg = captchaTileSvg(tile.tag, tile.seed);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function captchaTileSvg(tag: TileTag, seed: number): string {
  const hue = (seed * 17) % 360;
  const bg = `hsl(${hue} 42% 92%)`;
  const ink = `hsl(${(hue + 210) % 360} 38% 24%)`;
  const rot = (seed % 13) - 6;
  const body =
    tag === 'wave'
      ? `<path d="M12 78 C28 58 44 98 64 78 C84 58 100 98 116 74" stroke="hsl(198 72% 42%)" stroke-width="8" fill="none" stroke-linecap="round"/>
         <path d="M12 94 C32 80 48 108 68 90 C88 72 104 104 116 88" stroke="hsl(186 58% 48%)" stroke-width="6" fill="none"/>`
      : tag === 'palm'
        ? `<path d="M64 118 L64 62" stroke="${ink}" stroke-width="6" stroke-linecap="round"/>
           <path d="M64 70 C40 40 28 52 36 28 C52 48 64 44 64 70 C88 40 108 52 98 26 C84 48 64 44 64 70 C78 34 96 22 112 38 C84 48 70 58 64 70" fill="hsl(142 48% 36%)"/>`
        : tag === 'skate'
          ? `<rect x="22" y="70" width="84" height="10" rx="4" fill="hsl(322 72% 48%)" stroke="${ink}" stroke-width="2"/>
             <path d="M28 70 L40 48 H88 L100 70" fill="hsl(48 92% 58%)" stroke="${ink}" stroke-width="2"/>
             <circle cx="40" cy="92" r="9" fill="${ink}"/><circle cx="88" cy="92" r="9" fill="${ink}"/>`
          : tag === 'sun'
            ? `<circle cx="64" cy="64" r="22" fill="hsl(42 94% 56%)" stroke="${ink}" stroke-width="2"/>
               <g stroke="hsl(28 90% 48%)" stroke-width="4" stroke-linecap="round">
                 <path d="M64 18 V30 M64 98 V110 M18 64 H30 M98 64 H110 M32 32 L40 40 M96 96 L88 88 M96 32 L88 40 M32 96 L40 88"/>
               </g>`
            : `<circle cx="64" cy="58" r="22" fill="hsl(268 62% 56%)" stroke="${ink}" stroke-width="2"/>
               <path d="M48 78 L64 118 L80 78" fill="hsl(268 62% 56%)" stroke="${ink}" stroke-width="2"/>
               <circle cx="56" cy="54" r="3" fill="#fff"/><circle cx="72" cy="54" r="3" fill="#fff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" fill="none">
    <rect width="128" height="128" rx="20" fill="${bg}"/>
    <g transform="rotate(${rot} 64 64)">${body}</g>
  </svg>`;
}

export type CaptchaVerifyInput = {
  challengeId?: string | null;
  answer?: string | number | null;
  selected?: string[] | null;
  website?: string | null;
  powNonce?: string | null;
  moves?: number | null;
};

export type CaptchaVerifyResult =
  | { ok: true; token: string }
  | { ok: false; message: string };

export async function solveCaptcha(input: CaptchaVerifyInput): Promise<CaptchaVerifyResult> {
  if (input.website && String(input.website).trim() !== '') {
    return { ok: false, message: 'Проверка не пройдена' };
  }
  const id = String(input.challengeId || '').trim();
  if (!id || id.length < 16) {
    return { ok: false, message: 'Обновите проверку и попробуйте снова' };
  }

  const key = `captcha:${id}`;
  const stored = parseStored(await loadRaw(key));
  if (!stored) {
    return { ok: false, message: 'Проверка устарела — обновите' };
  }

  stored.attempts += 1;
  if (stored.attempts > 8) {
    await delRaw(key);
    return { ok: false, message: 'Слишком много попыток — обновите проверку' };
  }

  const elapsed = Date.now() - (stored.createdAt || 0);
  if (elapsed < 450) {
    await storeRaw(key, JSON.stringify(stored));
    return { ok: false, message: 'Подождите секунду и отметьте картинки' };
  }

  if (!powOk(id, stored.powSeed, stored.zeros, String(input.powNonce || ''))) {
    await storeRaw(key, JSON.stringify(stored));
    return { ok: false, message: 'Защита не подтверждена — обновите проверку' };
  }

  const sel = Array.isArray(input.selected)
    ? input.selected
    : String(input.answer || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  const given = `pick:${[...new Set(sel)].sort().join(',')}`;
  if (given !== stored.answer) {
    await storeRaw(key, JSON.stringify(stored));
    return { ok: false, message: 'Неверный набор картинок' };
  }

  await delRaw(key);
  const token = signToken(id);
  await storeRaw(`captcha:tok:${token}`, '1', 180);
  return { ok: true, token };
}

function signToken(challengeId: string) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${challengeId}.${Date.now()}.${nonce}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('hex').slice(0, 32);
  return `${payload}.${sig}`;
}

function timingEq(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export async function consumeCaptchaToken(
  token: string | null | undefined,
  honeypot?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (honeypot && String(honeypot).trim() !== '') {
    return { ok: false, message: 'Проверка не пройдена' };
  }
  const t = String(token || '').trim();
  if (!t || t.length < 20) {
    return { ok: false, message: 'Пройдите проверку «я не робот»' };
  }
  const parts = t.split('.');
  if (parts.length < 4) {
    return { ok: false, message: 'Пройдите проверку заново' };
  }
  const payload = parts.slice(0, -1).join('.');
  const sig = parts[parts.length - 1];
  const expect = crypto.createHmac('sha256', secret()).update(payload).digest('hex').slice(0, 32);
  if (!timingEq(sig, expect)) {
    return { ok: false, message: 'Пройдите проверку заново' };
  }

  const key = `captcha:tok:${t}`;
  const redis = getSharedRedis();
  if (redis) {
    const n = await redis.del(key);
    if (!n) return { ok: false, message: 'Проверка устарела — пройдите снова' };
  } else {
    cleanupMem();
    if (!MEM.has(key)) return { ok: false, message: 'Проверка устарела — пройдите снова' };
    MEM.delete(key);
  }
  return { ok: true };
}
