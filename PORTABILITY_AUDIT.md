# Переносимость (white-label) на чужой домен

Проверка на коде `/opt/sochi-portal` (эталон PROD на VPS). Команда:

`grep -rnw -E "py.idivles.ru|ty.idivles.ru" ./ --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`

**Итог: команда не «тишина».** Совпадений **~197**. Большая часть — документация, install-kit, nginx-шаблон эталона и QA-скрипты. В **runtime `src/`** домен зашит как **fallback**, не как единственный источник ссылок.

---

## 1. Переменные окружения

На живых контурах сейчас:

| Переменная | PROD | TEST | Зачем |
|---|---|---|---|
| `NEXTAUTH_URL` | `https://py.idivles.ru` | `https://ty.idivles.ru` | NextAuth, каноникал, CSRF extra host |
| `NEXT_PUBLIC_SITE_URL` | тот же origin | тот же origin | клиент/метрики, `originFromEnv()` |
| `NEXT_PUBLIC_BASE_URL` | **нет** | **нет** | в этом проекте **не используется** |

Канонический резолвер: `src/lib/site-identity-shared.ts` → `originFromEnv()` читает  
`NEXTAUTH_URL || NEXT_PUBLIC_SITE_URL`, иначе `http://localhost:3000`.  
Ещё слой: **`publicSiteUrl` в БД** (настройки / `/ops`) — `resolvePublicOrigin()`.

При переезде на `portal.new-company.ru` достаточно (и правильно для этого кода):

```env
NEXTAUTH_URL="https://portal.new-company.ru"
NEXT_PUBLIC_SITE_URL="https://portal.new-company.ru"
```

`NEXT_PUBLIC_BASE_URL` можно завести как алиас только если дописать код; сейчас это лишняя строка, приложение её не подхватит.

Дополнительно на новом стенде: `NEXTAUTH_SECRET`, БД, Redis, почта, `VAPID_SUBJECT` (сейчас завязан на mailto эталона — см. хардкод).

---

## 2. OAuth (Яндекс / VK / Telegram)

Callback вида  
`https://<новый-домен>/api/auth/callback/yandex` (и vk/telegram) **нельзя** вывести одной заменой `.env`: их регистрируют в кабинетах провайдеров.

Факт с текущего стенда:

- **ty:** в `/api/auth/providers` есть **yandex + telegram + credentials**.
- **py:** только **telegram + credentials** (Яндекс на проде не включён).
- **VK** как OAuth-провайдер **не отдаётся** ни на одном контуре.

На чужой организации: новые приложения Яндекс/VK/Telegram, новые Client ID/Secret в `.env`, redirect URI на новый хост.

---

## 3. Хардкод в `src/` (то, что мешает «сходу»)

Это не `fetch('https://py.idivles.ru/api/...')` (относительные `/api` в порядке), а **запасной origin**, если env/Host пустые:

| Файл | Что зашито |
|---|---|
| `src/lib/web-push.ts` | fallback `NEXTAUTH_URL` → `https://py.idivles.ru`; `mailto:noreply@py.idivles.ru` |
| `src/lib/referrals.ts` | два fallback на `https://py.idivles.ru` |
| `src/lib/ics.ts` | uid host fallback `py.idivles.ru` |
| `src/lib/vk-media.ts` | User-Agent `+https://py.idivles.ru` |
| `src/lib/max.ts` | fallback origin `https://py.idivles.ru` |
| `src/app/r/[code]/route.ts` | fallback Host `py.idivles.ru` |
| `src/app/admin/settings/page.tsx` | fallback URL + placeholder `info@py.idivles.ru` |
| `src/app/api/admin/bots/route.ts` | fallback origin + текст «Тест MAX с py.idivles.ru» |
| `src/app/api/admin/max/route.ts` | текст теста MAX с py |
| `src/app/api/invite/[token]/route.ts` | catch fallback `https://py.idivles.ru` |
| `src/components/Breadcrumbs.tsx` | `NEXTAUTH_URL \|\| https://py.idivles.ru` |
| `src/components/OpsSitePanel.tsx` | placeholder `https://ty.idivles.ru` |

Если `.env` задан, эти fallback **не должны** попасть в письма и OG. Риск: билд/cron/бот без Host-заголовка.

**Бренд:** `DEFAULT_SITE_NAME = 'Молодёжь Сочи'` в `site-identity-shared.ts`. White-label имя сайта — из БД (`siteName`), не из домена, но дефолт сочинский.

Остальные ~180 совпадений: `docs/`, `scripts/` (дефолт `STAGING_DOMAIN=ty.idivles.ru`, URL китов с py), `deploy/nginx-py-ty-dual.conf`, `AGENTS.md`. Для чужого сервера это **шаблоны эталона**; install-скрипты уже принимают `--prod-domain` / `--staging-domain`.

---

## 4. Nginx и CORS

- **Nginx:** эталонные vhost — `server_name py.idivles.ru` / `ty.idivles.ru`. На новой машине нужен свой `server_name` и свои сертификаты (как в kit: подстановка домена).
- **CORS-заголовок `Access-Control-Allow-Origin` в `src/` не найден** — API заточен под same-origin за Nginx.
- **CSRF** (`src/lib/csrf-origin.ts`): разрешены host запроса (`X-Forwarded-Host` / `Host`) **и** host из `NEXTAUTH_URL`. Жёсткого списка `py.idivles.ru` нет. Если `.env` и Nginx на одном новом домене — CORS/CSRF не должны отрезать свой же фронт.

---

## Резюме для переезда на `portal.new-company.ru`

Код Next.js **в целом портативный**, если:

1. Прописать `NEXTAUTH_URL` и `NEXT_PUBLIC_SITE_URL` (не `NEXT_PUBLIC_BASE_URL`).
2. Выставить `publicSiteUrl` в настройках/`/ops`.
3. Сменить Nginx `server_name` + Let's Encrypt.
4. Завести OAuth-приложения под новый callback.
5. По желанию убрать fallback `py.idivles.ru` из таблицы выше и дефолт «Молодёжь Сочи».

Без п. 4 социальный вход на новом домене не заведётся, даже при идеальном `.env`.
