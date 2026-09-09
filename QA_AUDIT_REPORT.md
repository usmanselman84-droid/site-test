# Результаты комплексного QA-аудита

Дата: 2026-09-09  
Контуры: `https://py.idivles.ru` (PROD) и `https://ty.idivles.ru` (TEST)  
Метод: HTTP/HTTPS снаружи, SSH на `77.110.125.241`, разбор HTML/API/Nginx/Docker.  
Визуальные пункты UI (бургер, 44×44, CLS) без интерактивного браузера помечены как **частично / не проверено визуально**.

Легенда: **PASS** · **FAIL** · **PARTIAL** · **N/A / не проверено** (нужен живой пользователь / браузер)

---

## 1. Функциональное тестирование

### Авторизация и сессии

| Проверка | PROD `py` | TEST `ty` | Комментарий |
|---|---|---|---|
| Вход email/пароль | не гонялся (бой) | PASS | На `ty` успешный `POST /api/auth/callback/credentials` после captcha. Хеши QA на стейдже выровнены скриптом `reset-staging-qa-passwords.mjs` (только TEST). |
| Яндекс / VK / Telegram | FAIL (Яндекс, VK) / PASS (Telegram) | PASS Яндекс+Telegram / FAIL VK | `GET /api/auth/providers`: на **py** только `telegram` + `credentials`. На **ty** `yandex` + `telegram` + `credentials`. **VK нет ни на одном контуре.** |
| Неверный пароль, без утечки БД | PASS | PASS | `POST /api/auth/callback/credentials` → **401**, JSON с человекочитаемым текстом (лимит попыток / ошибка входа), без SQL/stacktrace. |
| Истечение сессии | не проверено | не проверено | Нужна живая сессия и ожидание TTL. |
| Редирект `callbackUrl` | PASS (инфра) | PASS | `/dashboard` и `/admin` без сессии → **307** на `/login?callbackUrl=...` (для admin ещё `staff=1`). |
| Logout / cookies | не проверено | не проверено | Нужен браузер. |

### Личный кабинет, бронирование, админка

| Проверка | Статус | Комментарий |
|---|---|---|
| Редактирование профиля / приватность / QR / М-баллы | не проверено | Нужна авторизованная сессия. |
| Бронь прошлого / пересечений / фильтры / уведомления | PARTIAL | Анонимный `POST /api/bookings` → **403** `CSRF_ORIGIN` (защита есть). Логика дат/пересечений не гонялась от имени пользователя. |
| CRUD / пагинация админки | не проверено | `/admin` без сессии редиректит на логин. |
| RBAC обычный пользователь на `/admin` | PASS (`ty`) | `USER` / `PARTICIPANT` с сессией при заходе на `/admin` **редиректятся на `/dashboard`**, не остаются в админке. |

---

## 2. UI/UX и адаптив

| Проверка | Статус | Комментарий |
|---|---|---|
| 375px, overflow, бургер, 44×44, таблицы админки | не проверено визуально | Нет интерактивного прогона в браузере. |
| Единые кнопки / focus форм | PARTIAL | На `/login` инпуты с классом `yp-auth-input`, два `<label>`. |
| line-clamp / empty states | не проверено визуально | — |

---

## 3. Безопасность

| Проверка | Статус | Комментарий |
|---|---|---|
| XSS (экранирование) | PARTIAL | CSP строгий (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`). Полный XSS-пентест форм не делался. |
| CSRF | PASS | NextAuth отдаёт `csrfToken`. POST брони без Origin → **403 CSRF_ORIGIN**. |
| Rate limit login/API | PASS | Nginx `yp_auth` 5r/s + burst; с 6-й попытки `POST /api/auth/callback/credentials` → **429**. Есть и ответ приложения «Слишком много попыток входа». |
| IDOR | PARTIAL | Чужие ресурсы без сессии закрыты (401/403/404). Авторизованный IDOR не проверялся. |
| Порты БД/Redis | PASS | Postgres/Redis **не опубликованы** на хост (`PortBindings` пустые). Слушают только docker-сеть. **UFW**: incoming deny, открыты 22/80/443. Node на `127.0.0.1:3000/3001`. |

Заголовки (оба домена HTTPS): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`. На PROD дополнительно `X-YP-Env: production`.

---

## 4. Производительность

| Проверка | Статус | Комментарий |
|---|---|---|
| TTFB главной | PASS | Замер с агента: **py ~262 ms**, **ty ~256 ms** (динамика/HTML в бюджете &lt; 600 ms; статика не отдельно профилировалась Lighthouse). |
| LCP / CLS | не проверено | Нужен Lighthouse / полевые Web Vitals. |
| Next `<Image>` WebP/AVIF | PASS (конфиг) | `next.config.ts`: `formats: ['image/avif', 'image/webp']`. В HTML главной есть `/_next/image` и webp. |
| ISR новостей/афиши | PASS | `revalidate = 60` на news/events/clubs/projects/…. У **ty** главная: `x-nextjs-prerender: 1`, `s-maxage=60`. |
| Gzip/Brotli | PARTIAL | `gzip on` в nginx; HTML с `Accept-Encoding: gzip` сжимается. Расширенный `gzip_types` **закомментирован**; Brotli не найден. CSS `_next/static` без `Content-Encoding` в выборке. |

---

## 5. Инфраструктура и DevOps

| Проверка | Статус | Комментарий |
|---|---|---|
| Изоляция py / ty | PASS | Каталоги `/opt/sochi-portal` vs `/opt/sochi-portal-staging`; порты **3000 / 3001**; БД **sochi_portal / sochi_staging**; отдельные vhost Nginx. Тест записи в staging не попал в prod. |
| PM2 auto-restart | N/A (эквивалент Docker) | PM2 **не установлен**. Контейнеры `restart: always`, healthcheck, лимиты RAM. |
| Ротация логов PM2 | N/A (эквивалент Docker) | `json-file` `max-size=25m`, `max-file=5`. |
| SSL Let's Encrypt + renew | PASS | Серты до **2026-11-13**; `certbot.timer` **enabled/active**; cron `/etc/cron.d/certbot`. |
| HTTP → HTTPS | PASS | `301` на `https://py.idivles.ru/` и `https://ty.idivles.ru/`. |
| www → apex | FAIL | В Nginx **нет** `server_name www.py.idivles.ru`. DNS/ответ www снаружи пустой. |

Дополнительно: диск **89%** (`25G/30G`, свободно ~3.3G) — риск для логов/сборок.

---

## 6. SEO и a11y

| Проверка | Статус | Комментарий |
|---|---|---|
| Уникальные title / description | PARTIAL | Главная, новости, афиша, пространства — уникальные title. `/login` **совпадает** с главной («Молодёжь Сочи \| Официальный портал»). `/coworking` дублирует суффикс. `/about` → **308** `/p/about`. Description на проверенных страницах есть. |
| robots.txt | PASS | Disallow `/admin`, `/api/`, `/dashboard`, `/scanner`, `/scan`, `/login`, `/register`; Host и Sitemap на свой домен. |
| sitemap.xml | PASS | `200 application/xml`, URL вида `https://py.idivles.ru/...`. |
| Open Graph | PARTIAL | og:title и og:image есть. **ty**: `/opengraph-image` → **200 image/png**. **py**: og:image = `/icons/icon-512.png`; маршрут `/opengraph-image` → **404**. |
| img alt | PASS (выборка главной) | 34/34 `<img>` с `alt` на обеих главных. |
| label ↔ input | PASS (login) | 2 label, email+password. Связь `htmlFor` vs wrapping — по разметке labels присутствуют. |
| Клавиатура Tab | не проверено | Нужен браузер. |

---

## Сводка дефектов (приоритет)

1. **P2** На PROD нет OAuth Яндекс (и нигде нет VK) — расхождение контуров и чеклиста.
2. **P2** Нет редиректа `www.py.idivles.ru` → `py.idivles.ru`.
3. **P3** На PROD нет рабочего `/opengraph-image` (404); превью соцсетей через иконку 512.
4. **P3** Title `/login` не уникален; gzip_types/brotli для CSS/JS не дожаты.
5. **P3** Диск 89% — следить за местом.
6. Визуальный адаптив, LCP/CLS, CRUD броней/профиля, logout в UI — ещё на ручной прогон в браузере.
7. TECH при прямом заходе на `/scanner` получает сканер (не только `/ops`) — уточнить, задумано ли это.

Изоляция контуров (п. 5.1 чеклиста) подтверждена: тесты на `ty` не должны ломать пользователей `py` по процессам, портам и БД.

---

## 7. Ролевой прогон на TEST (`ty.idivles.ru`)

Вход: captcha «выберите картинки» + email/пароль QA. Сессия: `GET /api/auth/session`.

| Учётка | role в сессии | Куда пускает | Ожидание | Статус |
|---|---|---|---|---|
| `qa-admin@sochi.ru` | `ADMIN`, `isSuperAdmin: true` | `/admin`, `/admin/users`, `/dashboard`, `/scanner` остаются своими URL. `/ops` → **главная**, не ops. | Полная админка `/admin` | PASS (ops для TECH — верно, что admin не в /ops) |
| `mod@sochi.ru` | `MODERATOR` | `/admin` OK. `/admin/users` → `/admin?denied=1`. `/scanner` → `/admin`. `/ops` → главная. `/dashboard` OK | Контент/заявки, не полная админка | PASS |
| `part@sochi.ru` | `PARTICIPANT` | `/admin`, `/scanner`, `/ops` не держат: admin/scanner → **dashboard**, ops → главная | `/dashboard` | PASS |
| `user@sochi.ru` | `USER`, ecoPoints **120** | То же: админка недоступна, кабинет `/dashboard` | `/dashboard` | PASS |
| `scanner@sochi.ru` | `SCANNER` | `/scanner`, `/scan` → `/scanner?tab=pass`. `/admin` и `/dashboard` → **`/scanner`** | `/scanner` / `/scan` | PASS |
| `private@sochi.ru` | `USER`, ecoPoints **55** | Как обычный USER → `/dashboard` | кабинет | PASS (отличие баллов от `user@`; скрытие контактов в UI не разбиралось полем в БД) |
| `tech@sochi.ru` | `TECH` | Логин с `callbackUrl=/ops` → `{"url":".../ops"}`. `/admin`, `/dashboard` → **`/ops`**. Title страницы «Ops». `/scanner` при прямом URL открывается | `/ops`, не `/admin` | PASS по /ops и отсечению admin. **Замечание:** прямой `/scanner` для TECH тоже открывается |

Скрытие TECH в списке пользователей: в коде `/opt/sochi-portal-staging/src/app/admin/users/page.tsx` фильтр `role: { not: 'TECH' }` и пропуск `g.role === 'TECH'`. Карточка `/admin/users/[id]` для TECH не показывается.

Captcha обязательна: без токена — «Пройдите проверку „я не робот“». Неверный пароль при валидной captcha — «Неверные данные», без SQL.

**Не делалось в этом прогоне:** смена ФИО/аватара, QR, брони, визуальный адаптив, logout кнопкой, полный CRUD модератора.
