#!/usr/bin/env python3
from pathlib import Path

p = Path('/opt/sochi-portal-staging/src/lib/auth.ts')
t = p.read_text()
old = '''        if (sid && account.providerAccountId) {
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
        }'''
new = '''        if (sid && account.providerAccountId) {
          const { attachOauthToCurrentUser } = await import("./sso-link");
          await attachOauthToCurrentUser(sid, {
            provider: account.provider,
            providerAccountId: String(account.providerAccountId),
            type: account.type,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: typeof account.session_state === "string" ? account.session_state : null,
          });
        }'''
if old not in t:
    raise SystemExit('MISS signIn block')
t = t.replace(old, new, 1)
oldj = '''    async jwt({ token, user, account, trigger, session }) {
      if (account && account.provider && account.provider !== "credentials" && account.provider !== "telegram") {
        const { peekSessionUserId } = await import("./sso-link");
        const sid = await peekSessionUserId();
        if (sid) token.id = sid;
      }
      if (user) {
        token.id = user.id;'''
newj = '''    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.id = user.id;'''
if oldj not in t:
    raise SystemExit('MISS jwt start')
t = t.replace(oldj, newj, 1)
# after user block's first assignments, we need token.id = sid at end of oauth.
# Find a stable insert: after `if (user) { token.id = user.id;` we already set user.id.
# Add AFTER the whole `if (user) {` is messy. Insert right after jwt function starts user handling, then again after user block... 
# Simpler: inject after `if (user) {` closing is hard.
# Put sid override just before the dbUser fetch `if (token.id) {`
marker = '      if (token.id) {\n        try {\n          const dbUser = await prisma.user.findUnique({'
inject = '''      if (account && account.provider && account.provider !== "credentials" && account.provider !== "telegram") {
        const { peekSessionUserId } = await import("./sso-link");
        const sid = await peekSessionUserId();
        if (sid) token.id = sid;
      }
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({'''
if marker not in t:
    raise SystemExit('MISS token.id block')
if t.count(marker) != 1:
    raise SystemExit('ambiguous token.id')
t = t.replace(marker, inject, 1)
p.write_text(t)
print('auth patched')
