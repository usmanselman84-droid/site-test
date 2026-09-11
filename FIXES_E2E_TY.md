# Починка e2e-багов на ty (2026-09-10)

**Только ty.** py не меняли (`/cookies` на py по-прежнему 404).

Staging пересобран, контейнер **healthy**. Проверки после деплоя:

| Проверка | Результат |
|----------|-----------|
| `/cookies` | **302 → /privacy** (nginx + next.config) |
| `/dashboard/bookings` | **302 → /dashboard** |
| `/gallery` гость | заголовок «Галерея деятельности», **без** «Войдите» |
| `POST /api/register` | **201**, учётка создана, `emailVerified` |
| `STAGING_AUTO_VERIFY` | `1` в контейнере |
| py `/cookies` | 404 (не трогали) |

## Что сделано в коде (staging)

1. **Почта/регистрация** — `STAGING_AUTO_VERIFY=1`: если SMTP/Resend мёртв, аккаунт активируется сразу (не 503).
2. **Редиректы** — `/cookies` → `/privacy`, `/dashboard/bookings` → `/dashboard` (nginx ty + next.config).
3. **Модератор** — пустые `permissions` → полный `MODERATOR_PERMISSIONS`; QA `mod@sochi.ru` обновлён в БД.
4. **Галерея** — `force-dynamic`, живой флаг `galleryPublicEnabled`.
5. **SCANNER/TECH** — личные `/dashboard/me|settings|messages|friends` больше не кидают на scanner/ops.
6. **Логин** — IP bucket 25/мин, lock только на логин, не на весь NAT.

## Не копировать на py без «одобряю»

Особенно `STAGING_AUTO_VERIFY` — на проде пропускать письмо нельзя.
