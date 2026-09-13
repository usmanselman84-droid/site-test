import { createHmac } from 'crypto';
import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { SSO_PROVIDERS, type SsoProviderId } from '@/lib/sso-shared';

export { SSO_PROVIDERS, SSO_LABELS, type SsoProviderId } from '@/lib/sso-shared';

const BIND_COOKIE = 'yp-sso-bind';

function bindSecret() {
  return process.env.NEXTAUTH_SECRET || 'dev';
}

export function makeSsoBindToken(userId: string) {
  const sig = createHmac('sha256', bindSecret()).update(userId).digest('hex').slice(0, 32);
  return `${userId}.${sig}`;
}

export function readSsoBindToken(raw: string | undefined | null): string | null {
  if (!raw || !raw.includes('.')) return null;
  const i = raw.indexOf('.');
  const userId = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  if (!userId || !sig) return null;
  const expect = createHmac('sha256', bindSecret()).update(userId).digest('hex').slice(0, 32);
  if (sig !== expect) return null;
  return userId;
}

export async function peekSessionUserId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const bind = readSsoBindToken(jar.get(BIND_COOKIE)?.value);
    if (bind) return bind;
    const cookieHeader = jar
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    if (!cookieHeader) return null;
    const token = await getToken({
      req: { headers: { cookie: cookieHeader } } as never,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: (process.env.NEXTAUTH_URL || '').startsWith('https'),
    });
    return typeof token?.id === 'string' && token.id ? token.id : null;
  } catch {
    return null;
  }
}

export async function listLinkedProviders(userId: string) {
  const [accounts, user] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      select: { provider: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, email: true },
    }),
  ]);
  const linked = accounts
    .map((a) => a.provider)
    .filter((p): p is SsoProviderId => (SSO_PROVIDERS as readonly string[]).includes(p));
  return {
    linked: [...new Set(linked)],
    hasPassword: Boolean(user?.password),
    hasEmail: Boolean(user?.email),
  };
}

type OauthBits = {
  provider: string;
  providerAccountId: string;
  type?: string | null;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
};

/** Bind OAuth identity to the logged-in profile (moves it off a duplicate if needed). */
export async function attachOauthToCurrentUser(sid: string, account: OauthBits) {
  const providerAccountId = String(account.providerAccountId);
  const existing = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: account.provider, providerAccountId } },
  });
  await prisma.account.deleteMany({
    where: { userId: sid, provider: account.provider, NOT: { providerAccountId } },
  });
  const data = {
    userId: sid,
    type: account.type || 'oauth',
    provider: account.provider,
    providerAccountId,
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token ?? undefined,
    expires_at: account.expires_at ?? undefined,
    token_type: account.token_type ?? undefined,
    scope: account.scope ?? undefined,
    id_token: account.id_token ?? undefined,
    session_state: account.session_state ?? undefined,
  };
  if (!existing) {
    await prisma.account.create({ data });
    return;
  }
  const previousUserId = existing.userId;
  await prisma.account.update({
    where: { id: existing.id },
    data,
  });
  if (previousUserId && previousUserId !== sid) {
    await retireOrphanSocialUser(previousUserId, sid).catch(() => null);
  }
}

/** After SSO is moved onto the kept profile, hide the leftover social-only shell. */
export async function retireOrphanSocialUser(oldUserId: string, keepUserId: string) {
  if (!oldUserId || oldUserId === keepUserId) return;
  const leftover = await prisma.account.count({ where: { userId: oldUserId } });
  if (leftover > 0) return;
  const old = await prisma.user.findUnique({
    where: { id: oldUserId },
    select: {
      password: true,
      deletedAt: true,
      telegramChatId: true,
      image: true,
    },
  });
  if (!old || old.deletedAt || old.password) return;

  const keep = await prisma.user.findUnique({
    where: { id: keepUserId },
    select: { telegramChatId: true, image: true },
  });
  if (keep) {
    const patch: { telegramChatId?: string; image?: string } = {};
    if (!keep.telegramChatId && old.telegramChatId) patch.telegramChatId = old.telegramChatId;
    if (!keep.image && old.image) patch.image = old.image;
    if (Object.keys(patch).length) {
      await prisma.user.update({ where: { id: keepUserId }, data: patch });
    }
  }

  await prisma.user.update({
    where: { id: oldUserId },
    data: { deletedAt: new Date() },
  });
}

export async function unlinkProvider(userId: string, provider: SsoProviderId) {
  const state = await listLinkedProviders(userId);
  const remainingOauth = state.linked.filter((p) => p !== provider);
  if (!state.hasPassword && remainingOauth.length === 0) {
    throw new Error('Нельзя отвязать последний способ входа. Сначала задайте пароль.');
  }
  await prisma.account.deleteMany({ where: { userId, provider } });
}
