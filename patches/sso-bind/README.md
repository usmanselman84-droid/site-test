# SSO bind + legal/FAQ (ty 1.6.182)

Карта файлов на VPS `/opt/sochi-portal-staging`:

| patch | dest |
|---|---|
| auth.ts | src/lib/auth.ts |
| sso-shared.ts | src/lib/sso-shared.ts |
| sso-link.ts | src/lib/sso-link.ts |
| sso-route.ts | src/app/api/user/sso/route.ts |
| LinkedAccountsPanel.tsx | src/components/LinkedAccountsPanel.tsx |
| DashboardSettingsHub.tsx | src/components/DashboardSettingsHub.tsx |
| consent-versions.ts | src/lib/consent-versions.ts |
| faq-content.ts | src/lib/faq-content.ts |
| faq-db.ts | src/lib/faq-db.ts |
| profile-guides.ts | src/lib/profile-guides.ts |
| ProfileGuides.tsx | src/components/ProfileGuides.tsx |
| legal/*.mdx | content/legal/ |
| guide.md | docs/user/guide.md |
| app-version.ts | src/lib/app-version.ts |

Пользователь привязывает Яндекс / VK / Telegram / Госуслуги **из кабинета** (Настройки → «Вход через соцсети»), уже войдя. Кнопки на `/login` без сессии создают новый профиль, если провайдер не вернул совпадающий email (типично Telegram).
