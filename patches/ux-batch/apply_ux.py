#!/usr/bin/env python3
from pathlib import Path

R = Path('/opt/sochi-portal-staging')

def sub(rel, a, b):
    p = R / rel
    t = p.read_text()
    if a not in t:
        print('MISS', rel, a[:60].replace('\n',' '))
        return
    p.write_text(t.replace(a, b, 1))
    print('ok', rel)

# Navbar: cabinet chips include notifications
sub(
    'src/components/Navbar.tsx',
    '''              <div className="mobile-menu__chips" aria-label="Кабинет">
                <Link href="/dashboard/tickets" onClick={closeMenu} className="mobile-menu__chip">
                  Билеты
                </Link>''',
    '''              <div className="mobile-menu__chips" aria-label="Кабинет">
                <Link href="/dashboard/notifications" onClick={closeMenu} className="mobile-menu__chip">
                  Уведомления
                </Link>
                <Link href="/dashboard/tickets" onClick={closeMenu} className="mobile-menu__chip">
                  Билеты
                </Link>''',
)

# EcoPointsPanel: don't open every slot
sub(
    'src/components/EcoPointsPanel.tsx',
    "const [openSlot, setOpenSlot] = useState<CosmeticSlot | 'all'>('all');",
    "const [openSlot, setOpenSlot] = useState<CosmeticSlot | 'all' | null>('frame');",
)

# layout css
sub(
    'src/app/layout.tsx',
    "import './scroll-perf.css';",
    "import './scroll-perf.css';\nimport './ux-batch.css';",
)

# sso API bind token + getAuthOptions
sub(
    'src/app/api/user/sso/route.ts',
    "import { authOptions } from '@/lib/auth';",
    "import { authOptions, getAuthOptions } from '@/lib/auth';",
)
sub(
    'src/app/api/user/sso/route.ts',
    """  listLinkedProviders,
  unlinkProvider,
  SSO_PROVIDERS,
  type SsoProviderId,
} from '@/lib/sso-link';""",
    """  listLinkedProviders,
  unlinkProvider,
  makeSsoBindToken,
  SSO_PROVIDERS,
  type SsoProviderId,
} from '@/lib/sso-link';""",
)
sub(
    'src/app/api/user/sso/route.ts',
    """  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const [state, flags] = await Promise.all([listLinkedProviders(session.user.id), oauthProviderFlags()]);
  return NextResponse.json({
    ...state,
    available: {""",
    """  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const [state, flags] = await Promise.all([listLinkedProviders(session.user.id), oauthProviderFlags()]);
  return NextResponse.json({
    ...state,
    bindToken: makeSsoBindToken(session.user.id),
    available: {""",
)

# auth jwt keep current user on OAuth bind
sub(
    'src/lib/auth.ts',
    '    async jwt({ token, user, trigger, session }) {\n      if (user) {',
    '''    async jwt({ token, user, account, trigger, session }) {
      if (account && account.provider && account.provider !== "credentials" && account.provider !== "telegram") {
        const { peekSessionUserId } = await import("./sso-link");
        const sid = await peekSessionUserId();
        if (sid) token.id = sid;
      }
      if (user) {''',
)

# auth signIn: explicit Account row on current session
old = '''      if (account?.provider && account.provider !== "credentials" && account.provider !== "telegram") {
        const { peekSessionUserId } = await import("./sso-link");
        const sid = await peekSessionUserId();
        if (sid && user?.id && String(user.id) !== sid) {
          return "/dashboard/settings?section=sso&error=" + encodeURIComponent("Эта соцсеть уже привязана к другому профилю");
        }'''
new = '''      if (account?.provider && account.provider !== "credentials" && account.provider !== "telegram") {
        const { peekSessionUserId } = await import("./sso-link");
        const sid = await peekSessionUserId();
        if (sid && account.providerAccountId) {
          const existingAcc = await prisma.account.findUnique({
            where: { provider_providerAccountId: { provider: account.provider, providerAccountId: String(account.providerAccountId) } },
          });
          if (existingAcc && existingAcc.userId !== sid) {
            return "/dashboard/settings?section=sso&error=" + encodeURIComponent("Эта соцсеть уже привязана к другому профилю");
          }
          if (!existingAcc) {
            await prisma.account.create({
              data: {
                userId: sid,
                type: account.type || "oauth",
                provider: account.provider,
                providerAccountId: String(account.providerAccountId),
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state as string | undefined,
              },
            }).catch(() => null);
          }
        }
        if (sid && user?.id && String(user.id) !== sid) {
          return true;
        }'''
sub('src/lib/auth.ts', old, new)

print('done')
