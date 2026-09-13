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

export async function unlinkProvider(userId: string, provider: SsoProviderId) {
  const state = await listLinkedProviders(userId);
  const remainingOauth = state.linked.filter((p) => p !== provider);
  if (!state.hasPassword && remainingOauth.length === 0) {
    throw new Error('Нельзя отвязать последний способ входа. Сначала задайте пароль.');
  }
  await prisma.account.deleteMany({ where: { userId, provider } });
}
