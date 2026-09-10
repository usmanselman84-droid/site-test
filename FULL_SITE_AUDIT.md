# Полная проверка YoungPortal (ty + py)

**UTC:** 2026-09-10 ~19:00  
**Overall (скрипт):** **84 / 100** — workable, закрыть FAIL/WARN  
**Глубокий скан:** `/tmp/yp-flaw-20260910T190100Z` на VPS  
**Автоаудит:** `bash /opt/cursor-agent/scripts/audit-youngportal.sh both`

| Измерение | Балл |
|-----------|------|
| Availability | 94 |
| Security headers | 100 |
| UX shell | 90 |
| Auth/SSO | 67 |
| Ops capacity | **28** |

---

## Критично (чинить первым)

### 1. Диск и RAM на VPS
- Диск **88%** (~3.5G свободно из 30G) — score 25.
- RAM available ~**240–330MB** из 1.9G — риск OOM/502 при `docker compose build`.
- Docker build cache ~**4.3G** (reclaimable ~1.9G): перед rebuild — `docker builder prune`.

### 2. Prod без Яндекс SSO
- **ty:** `oauth.yandex=true`, NextAuth providers: yandex + telegram + credentials.
- **py:** `oauth.yandex=false`, providers только telegram + credentials.
- Причина: prod `/opt/sochi-portal/src/lib/oauth-providers.ts` **без** merge `SiteSettings.oauthSsoJson` (только env). Staging патч есть, prod образ не пересобран с ним.
- VK / Telegram UI / ESIA / SMS: везде `ready=false` или не сконфигурированы.

### 3. Мобильный hero не в рантайме
- Файл `/covers/photo/sochi-sea-mobile.jpg` есть на ty/py (**HTTP 200**).
- Исходник staging `HomeHeroMedia.tsx` уже с `mobileArtDirection` + `<picture>`.
- **Собранный** chunk в контейнере staging всё ещё старый (один `<Image src=poster>`), в HTML главной: `sochi-sea.jpg` ×2, **`sochi-sea-mobile` = 0**, `<picture>` = 0.
- Nginx: `theme.css?v=hdr22`, `header-boot.js?v=13` — CSS живой, SSR/JS hero — нет.
- Нужен **корректный rebuild staging** (без кэша слоя src) и проверка HTML на mobile.

### 4. Postgres recovery в логах prod
- В хвосте `sochi-portal-web-1`: много `57P03 the database system is in recovery mode`.
- Сейчас контейнеры **healthy**, `/api/health` ok — но это признак прошлых падений; при низкой RAM риск повтора.

### 5. Next static→dynamic errors (staging)
- Повторяющиеся: `/privacy`, `/terms`, `/_not-found` — `Page changed from static to dynamic at runtime, reason: headers`.
- Плюс `prisma:error Connection terminated due to connection timeout` на staging.

---

## Высокий приоритет

| Проблема | ty | py | Детали |
|----------|----|----|--------|
| `/cookies` | **404** | **404** | Consent/privacy ссылаются на cookie UX; отдельной страницы нет (есть `/privacy`). |
| `/profile` | 307 → `/dashboard/settings` | **404** | Parity сломан: на prod нет редиректа/роута. Nav ещё знает `/profile` как settings. |
| SSO UI vs API | providers yandex | нет yandex | На login HTML «соцсеть»/VK-сигналы есть на обоих; на py кнопок реального OAuth нет. |
| Audit script stale | — | — | Проверка brand всё ещё пишет «hdr20 live», фактически **hdr22**. |

---

## Средний приоритет / UX

- **Cookie gate:** в HTML есть consent-разметка (WARN 80); полноценность только после Accept в браузере (скрипт не кликает).
- **Чаты в BottomNav:** в исходнике и в chunk staging/prod строка «Чаты» находится; на главной без логина не видно — нужна ручная проверка dock.
- **Профиль → `/dashboard/me`:** в BottomNav staging есть; chrome кабинета — см. CABINET_CHROME.
- **Lighthouse (ранее):** dashboard LCP ~3.8s, CLS ~0.22 — тяжёлый client cabinet.
- **Модули в status:** smsLoginEnabled=true но smsLoginReady=false; esiaLoginEnabled=false.
- **Сообщения:** намеренно immersive (без marketing header) — не баг, но отличается от desk/friends.

---

## Что в порядке

- Home ty/py **200**, ~200–400ms.
- Публичные каталоги (faq, news, gallery, about, grants, vacancies, contests, dobro, terms, privacy, search) **200**.
- Auth-gated `/dashboard*` отвечают (редирект на login).
- Security: HSTS, CSP, X-Frame, nosniff, referrer-policy.
- Assets: `sochi-sea.jpg`, `sochi-sea-mobile.jpg`, brand CSS/JS **200**.
- Контейнеры web/db/redis **healthy** на момент проверки.
- `/api/public/status`, captcha challenge, `/api/health` ok.

---

## Рекомендуемый порядок работ

1. Освободить диск/RAM (`docker builder prune`, не держать лишние образы).
2. Rebuild **staging** без устаревшего слоя src → подтвердить `<picture>` / `sochi-sea-mobile` в HTML.
3. Перенести SSO merge на **prod** и rebuild py (осторожно с RAM).
4. `/profile` на py → тот же 307 что на ty; `/cookies` → страница или редирект на `/privacy#cookies`.
5. Починить static/dynamic на privacy/terms (не вызывать `headers()` в static path).
6. Обновить audit-скрипт: проверка `hdr22`, пункт hero-mobile, `/cookies`, profile parity.
7. Ручной UX: cookie Accept, login Яндекс (ty), Back/Cancel edit, dock Чаты/Моя страница.

---

## Вердикт

Сайт **живой и в целом usable**. Главные изъяны: **ёмкость VPS**, **prod без Yandex SSO**, **мобильный hero не попал в Docker-образ**, **битый `/profile` на py**, **404 `/cookies`**, шум в логах (static→dynamic + история DB recovery). Визуальная оболочка (hdr22) и публичные страницы в норме.
