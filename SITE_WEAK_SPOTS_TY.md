# Слабые и проблемные места — ty.idivles.ru

Дата: 2026-09-12  
Контур: только **ty** (staging). **py не трогали.**  
Метод: HTTP-проба всех публичных/кабинетных URL, sitemap, навбар/футер/bottom/cabinet-nav, выборочные деталки, SQL-счётчики staging DB, сверка с кодом `/opt/sochi-portal-staging`.

Легенда приоритетов: **P0** ломает сценарий · **P1** заметный UX/SEO/долг · **P2** косметика / известные product-gates.

---

## Краткий вердикт

Сайт в целом **живой**: афиша, новости, проекты, пространства, места, клубы, гранты, добро, самоуправление, игры, поиск, sitemap — 200. Auth-gate на кабинет/админку работает.  

Главные слабые места: **пустые/тонкие каталоги (контент или SSR)**, **битые/призрачные URL**, **дубли title/H1**, **медленные отдельные страницы**, **IA spaces/coworking/places** (частично уже подписано), cookie+captcha как product-gates.

---

## P0 — чинить в первую очередь

| # | Проблема | Доказательство | Что делать |
|---|----------|----------------|------------|
| 1 | **Публичного списка наград нет** | `GET /awards` → **404**. Есть только `/awards/[id]`, `/dashboard/awards`, `/admin/awards` | Либо список `/awards`, либо убрать/не светить публичные ссылки на каталог |
| 2 | **Призрачные URL кабинета** | Нет страниц: `/dashboard/favorites`, `/orders`, `/points`, `/profile/edit`. После логина callback ведёт на **несуществующий** path (в отличие от `/dashboard/bookings` → redirect на `/dashboard` в `next.config`) | Добавить redirects в `next.config` **или** удалить ссылки; единый канон: `edit`, `rewards`, `tickets`, `shop` |
| 3 | **Конкурсы/вакансии «пустые» без JS** | DB: Contest×2 OPEN, Vacancy×4 OPEN; API `/api/contests` / `/api/vacancies` отдают items. HTML без гидрации: **0 карточек** (`ContestsClient` — client-only, `force-static`) | SSR списка или skeleton/empty с данными; не отдавать «пустую оболочку» |
| 4 | **`/portfolio` для гостя — пустая оболочка** | 200, **нет H1**, title дефолтный «Молодёжь Сочи…». В коде задуман redirect на login→`/dashboard/portfolio`, live-ответ тонкий | Выровнять runtime с кодом: login redirect или публичный лендинг с CTA |

---

## P1 — заметные слабости

### Контент / пустота

| Место | Сигнал | Комментарий |
|-------|--------|-------------|
| `/documents` | OfficialDocument = **0**; SiteDocument = 7 | Хаб есть, файловая библиотека тонкая |
| `/gallery` | Мало карточек в HTML | Раздел «живой», но визуально бедный |
| Новые юзеры: friends/messages | Ожидаемо пусто | Нужен онбординг-бот / CTA (уже в бэклоге) |
| Кабинет `/dashboard/me` | Ранее «тупил и пустоты» из‑за skel 28rem | На ty уже densify; следить за регрессом |

### SEO / разметка

| Место | Сигнал |
|-------|--------|
| `/coworking` | Title: «… \| Молодёжь Сочи \| Молодёжь Сочи» (**дубль бренда**) |
| `/privacy`, `/terms`, `/rules` | **Два одинаковых H1** на странице |
| `/games`, `/portfolio`, `/reset-password` | Дефолтный title без уникального имени раздела |
| `/check-in` | TTFB **~2.3–2.5 s** |
| Отдельные `/projects/*`, `/spaces/*` | Иногда **1.6–2.4 s** |

### Навигация / IA

| Место | Сигнал |
|-------|--------|
| `/spaces` vs `/coworking` vs `/places` | Разные сущности, но рядом в меню — путаница (подписи ЦРМ / запись / гид уже частично есть) |
| Публичные `/shop`, `/achievements`, `/opportunities` | **404** (нормально: живут в `/dashboard/*`) — не линковать с маркетинга |
| `/staff` | 404; staff-вход через `/admin`, `/ops`, `/scanner` |
| `/cookies` | → `/privacy` (ок, алиас) |
| `/more` | Legacy-хаб «Профиль» → login/dashboard (ок) |
| Bottom nav `/dashboard/messages` и т.п. | Без сессии → login (ожидаемо) |

### Auth / product-gates (не баги, но трение)

- Cookie-баннер + lock scroll до согласия (**152-ФЗ**).
- Captcha на login (tile challenge) — без решения API-логин с агента не пройти.
- OAuth на ty: yandex + telegram + credentials; **VK нет** (и на py провайдеры уже, см. QA_AUDIT).

### Perf

- Холодная `/` ~0.6–0.9 s (приемлемо для динамики).
- Каталоги обычно 0.3–0.5 s.
- Аномалии: `/check-in`, редкие detail project/space, иногда `/dashboard/messages` redirect ~2.5 s.

---

## P2 — косметика / долг

- Дублирующие CTA на главной (spaces/coworking много раз).
- `/reset-password` без валидного токена: «Неверная ссылка» — ок, но title/H1 слабые.
- `/tickets`, `/presentation`, `/scanner`, `/scan` — staff/auth only (ожидаемо).
- CSS brand-debt / hdr-bump на nginx (отдельный трек).
- Монолит messages / unread badge в dock (бэклог messages).

---

## Карта «что реально есть» (срез)

### Публичное — OK (200)
`/`, `/events`, `/news`, `/projects`, `/spaces`, `/coworking`, `/places`, `/gallery`, `/clubs`, `/contests`, `/grants`, `/dobro`, `/vacancies`, `/documents`, `/self-gov`, `/games`, `/faq`, `/contacts`, `/search`, `/login`, `/register`, `/forgot-password`, `/privacy`, `/terms`, `/rules`, `/p/about`, `/sitemap.xml`, `/robots.txt`, `/api/health`, `/api/events`

### Публичное — 404 / нет смысла как каталог
`/awards` (нет index), `/shop`, `/achievements`, `/opportunities`, `/staff`, `/programs`, `/portfolios`, `/game` (есть `/games`), `/book` (нет page; в коде только pathname-хелперы)

### Кабинет (без сессии → login)
Реальные маршруты на диске:  
`me`, `messages`, `friends`, `shop`, `achievements`, `awards`, `tickets`, `applications`, `briefings`, `guides`, `portfolio`, `referrals`, `games`, `rewards`, `showcase`, `settings`, `edit`, `notifications`  

**Призраки:** `favorites`, `orders`, `points`, `profile/edit`  
**Явный redirect:** `bookings` → `/dashboard`

### Staging DB (live counts)
| Таблица | n |
|--------|---|
| Project | 22 |
| News | 16 |
| Place | 18 |
| Club | 15 |
| Space | 12 |
| PortalProgram | 9 |
| Booking | 8 |
| Contest | 2 |
| Vacancy | 4 |
| OfficialDocument | 0 |
| SiteDocument | 7 |
| User | 17 |
| Conversation | 10 |
| DirectMessage | 56 |

---

## Не считать багами

1. Cookie consent gate.  
2. Captcha на входе.  
3. Скрытие marketing Navbar на `/dashboard/*` (свой chrome).  
4. Immersive messages без bottom dock в треде.  
5. `/spaces` ≠ `/coworking` ≠ `/places` (разные модели).

---

## Рекомендуемый порядок на ty

1. **P0:** redirects для ghost cabinet paths; `/awards` list или noindex/убрать ссылки; SSR/skeleton contests+vacancies; починить `/portfolio` guest.  
2. **P1:** unique titles + один H1 на legal; ускорить `/check-in`; онбординг пустого inbox.  
3. **P1:** добить подписи IA spaces/coworking/places + empty states документов/галереи.  
4. **py** — только после явного «одобряю».

---

## Артефакты прогона

- Локально у агента: `/tmp/yp_full_audit.json`, `/tmp/yp_full_audit2.json`  
- Код/данные: `/opt/sochi-portal-staging`, DB `sochi_staging`
