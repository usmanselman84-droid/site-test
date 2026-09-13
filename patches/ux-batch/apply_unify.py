#!/usr/bin/env python3
from pathlib import Path
p = Path('/opt/sochi-portal-staging/src/lib/auth.ts')
t = p.read_text()
old = '''          if (sessionUserId && sessionUserId !== existingAcc.userId) {
            throw new Error("Этот Telegram уже привязан к другому профилю");
          }
          return existingAcc.user as any;'''
new = '''          if (sessionUserId && sessionUserId !== existingAcc.userId) {
            const { attachOauthToCurrentUser } = await import("./sso-link");
            await attachOauthToCurrentUser(sessionUserId, {
              provider: "telegram",
              providerAccountId,
              type: "oauth",
            });
            const sessionUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
            if (!sessionUser || sessionUser.blockedAt || sessionUser.deletedAt) {
              throw new Error("Аккаунт недоступен");
            }
            return sessionUser as any;
          }
          return existingAcc.user as any;'''
if old not in t:
    raise SystemExit('MISS telegram bind')
p.write_text(t.replace(old, new, 1))
hub = Path('/opt/sochi-portal-staging/src/components/DashboardSettingsHub.tsx')
ht = hub.read_text()
ht2 = ht.replace(
    "{ id: 'sso', title: 'Вход через соцсети', desc: 'Яндекс, VK, Telegram, Госуслуги', icon: Link2 },",
    "{ id: 'sso', title: 'Вход через соцсети', desc: 'Собрать Яндекс, VK, Telegram на одном профиле', icon: Link2 },",
)
hub.write_text(ht2)
print('ok telegram+hub')
