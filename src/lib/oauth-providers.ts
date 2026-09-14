/**
 * Optional OAuth providers (Yandex / VK / ESIA / Telegram widget).
 * Env vars win; SiteSettings.oauthSsoJson is the /ops fallback.
 */

import { prisma } from '@/lib/prisma';
import { telegramBotUsername as telegramBotUsernameFromEnv, telegramLoginReady as telegramLoginReadyFromEnv } from '@/lib/telegram-login';
import { tgGetMe } from '@/lib/telegram';

export type SsoCreds = {
  yandexId: string;
  yandexSecret: string;
  vkId: string;
  vkSecret: string;
  telegramToken: string;
  telegramUser: string;
  esiaId: string;
  esiaSecret: string;
};

function esiaEnv() {
  const clientId = (process.env.ESIA_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ESIA_CLIENT_SECRET || '').trim();
  return { clientId, clientSecret, ready: Boolean(clientId && clientSecret) };
}

function fromEnv(): SsoCreds {
  const esia = esiaEnv();
  return {
    yandexId: (process.env.YANDEX_CLIENT_ID || '').trim(),
    yandexSecret: (process.env.YANDEX_CLIENT_SECRET || '').trim(),
    vkId: (process.env.VK_CLIENT_ID || '').trim(),
    vkSecret: (process.env.VK_CLIENT_SECRET || '').trim(),
    telegramToken: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    telegramUser: telegramBotUsernameFromEnv(),
    esiaId: esia.clientId,
    esiaSecret: esia.clientSecret,
  };
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function parseSsoJson(raw: string | null | undefined): Partial<SsoCreds> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== 'object') return {};
    return {
      yandexId: pick(o, ['yandexClientId', 'yandexId', 'YANDEX_CLIENT_ID']),
      yandexSecret: pick(o, ['yandexClientSecret', 'yandexSecret', 'YANDEX_CLIENT_SECRET']),
      vkId: pick(o, ['vkClientId', 'vkId', 'VK_CLIENT_ID']),
      vkSecret: pick(o, ['vkClientSecret', 'vkSecret', 'VK_CLIENT_SECRET']),
      telegramToken: pick(o, ['telegramBotToken', 'telegramToken', 'TELEGRAM_BOT_TOKEN']),
      telegramUser: pick(o, ['telegramBotUsername', 'telegramUser', 'TELEGRAM_BOT_USERNAME']).replace(/^@/, ''),
      esiaId: pick(o, ['esiaClientId', 'esiaId', 'ESIA_CLIENT_ID']),
      esiaSecret: pick(o, ['esiaClientSecret', 'esiaSecret', 'ESIA_CLIENT_SECRET']),
    };
  } catch {
    return {};
  }
}

let cache: { at: number; creds: SsoCreds } | null = null;

export function invalidateSsoCache() {
  cache = null;
}

export async function resolveSsoCreds(): Promise<SsoCreds> {
  if (cache && Date.now() - cache.at < 15_000) return cache.creds;
  const env = fromEnv();
  try {
    const row = await prisma.siteSettings.findFirst({
      select: { oauthSsoJson: true, telegramBotToken: true },
    });
    const db = parseSsoJson(row?.oauthSsoJson);
    const telegramToken = env.telegramToken || db.telegramToken || (row?.telegramBotToken || '').trim();
    let telegramUser = env.telegramUser || db.telegramUser || '';
    if (telegramToken && !telegramUser) {
      try {
        const me = await tgGetMe(telegramToken);
        const u =
          me.result && typeof me.result === 'object'
            ? String((me.result as { username?: string }).username || '').replace(/^@/, '')
            : '';
        if (u) telegramUser = u;
      } catch {
        /* keep empty username */
      }
    }
    const creds: SsoCreds = {
      yandexId: env.yandexId || db.yandexId || '',
      yandexSecret: env.yandexSecret || db.yandexSecret || '',
      vkId: env.vkId || db.vkId || '',
      vkSecret: env.vkSecret || db.vkSecret || '',
      telegramToken,
      telegramUser,
      esiaId: env.esiaId || db.esiaId || '',
      esiaSecret: env.esiaSecret || db.esiaSecret || '',
    };
    cache = { at: Date.now(), creds };
    return creds;
  } catch {
    return env;
  }
}

export function buildOptionalOAuthProviders(sso?: SsoCreds): any[] {
  const creds = sso || fromEnv();
  const out: any[] = [];

  if (creds.yandexId && creds.yandexSecret) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YandexProvider = require('next-auth/providers/yandex').default;
    out.push(
      YandexProvider({
        clientId: creds.yandexId,
        clientSecret: creds.yandexSecret,
        allowDangerousEmailAccountLinking: true,
      })
    );
  }

  if (creds.vkId && creds.vkSecret) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const VkProvider = require('next-auth/providers/vk').default;
    out.push(
      VkProvider({
        clientId: creds.vkId,
        clientSecret: creds.vkSecret,
        allowDangerousEmailAccountLinking: true,
        authorization: { params: { scope: 'email' } },
        profile(profile: Record<string, unknown>) {
          const first = String(profile.first_name || profile.given_name || '');
          const last = String(profile.last_name || profile.family_name || '');
          const name = [first, last].filter(Boolean).join(' ') || String(profile.name || 'VK');
          const image = String(profile.photo_200 || profile.photo_100 || profile.picture || profile.image || '');
          return {
            id: String(profile.id || profile.sub || ''),
            name,
            email: typeof profile.email === 'string' ? profile.email : null,
            image: image || null,
            bdate: profile.bdate ? String(profile.bdate) : null,
          };
        },
      })
    );
  }

  if (creds.esiaId && creds.esiaSecret) {
    out.push({
      id: 'esia',
      name: 'Госуслуги',
      type: 'oauth',
      clientId: creds.esiaId,
      clientSecret: creds.esiaSecret,
      allowDangerousEmailAccountLinking: true,
      checks: 'pkce',
      authorization: {
        url: (process.env.ESIA_AUTH_URL || 'https://esia.gosuslugi.ru/aas/oauth2/ac').trim(),
        params: {
          scope: (process.env.ESIA_SCOPE || 'openid fullname email mobile').trim(),
          response_type: 'code',
        },
      },
      token: (process.env.ESIA_TOKEN_URL || 'https://esia.gosuslugi.ru/aas/oauth2/te').trim(),
      userinfo: (process.env.ESIA_USERINFO_URL || 'https://esia.gosuslugi.ru/rs/prns').trim(),
      issuer: (process.env.ESIA_ISSUER || 'https://esia.gosuslugi.ru').trim(),
      profile(profile: Record<string, unknown>) {
        const oid = String(profile.oid || profile.sub || profile.id || '');
        const first = String(profile.firstName || profile.given_name || '');
        const last = String(profile.lastName || profile.family_name || '');
        const name = [first, last].filter(Boolean).join(' ') || String(profile.name || 'Госуслуги');
        const email = typeof profile.email === 'string' && profile.email.includes('@') ? profile.email : null;
        const mobile = typeof profile.mobile === 'string' ? profile.mobile : null;
        return {
          id: oid || `esia:${name}`,
          name,
          email,
          phone: mobile,
        };
      },
    });
  }

  return out;
}

export async function oauthProviderFlags() {
  const sso = await resolveSsoCreds();
  return {
    yandex: Boolean(sso.yandexId && sso.yandexSecret),
    vk: Boolean(sso.vkId && sso.vkSecret),
    telegram: Boolean(sso.telegramToken && sso.telegramUser) || telegramLoginReadyFromEnv(),
    telegramBot: sso.telegramUser || (telegramLoginReadyFromEnv() ? telegramBotUsernameFromEnv() : ''),
    telegramBotId: (sso.telegramToken.split(':')[0] || '').replace(/\D/g, ''),
    esia: Boolean(sso.esiaId && sso.esiaSecret) || esiaEnv().ready,
  };
}
