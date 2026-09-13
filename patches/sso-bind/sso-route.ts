import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/csrf-origin';
import { oauthProviderFlags } from '@/lib/oauth-providers';
import {
  listLinkedProviders,
  unlinkProvider,
  SSO_PROVIDERS,
  type SsoProviderId,
} from '@/lib/sso-link';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const [state, flags] = await Promise.all([listLinkedProviders(session.user.id), oauthProviderFlags()]);
  return NextResponse.json({
    ...state,
    available: {
      yandex: Boolean(flags.yandex),
      vk: Boolean(flags.vk),
      telegram: Boolean(flags.telegram),
      esia: Boolean(flags.esia),
      telegramBot: flags.telegramBot || '',
    },
  });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const body = await req.json().catch(() => ({}));
  const provider = String((body as { provider?: string }).provider || '') as SsoProviderId;
  if (!(SSO_PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json({ message: 'Неизвестный провайдер' }, { status: 400 });
  }
  try {
    await unlinkProvider(session.user.id, provider);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Ошибка' }, { status: 400 });
  }
}
