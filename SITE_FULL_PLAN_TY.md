# Полный план устранения проблем YoungPortal (ty)

Аудит: 2026-09-11. Контур: `/opt/sochi-portal-staging` → **ty**. Prod **py не трогать**, пока нет «одобряю».

Стек: Next.js + Prisma (~71 model) + Docker. ~249 компонентов, ~162 API route, `globals.css` ~711 KB + `theme.css` ~135 KB поверх.

---

## Карта поверхностей

| Зона | Пути | Состояние |
|------|------|-----------|
| Публичка | `/`, афиша, коворкинг, новости, галерея, вакансии, конкурсы | В основном 200; главная холодный TTFB ~2.5s |
| Auth | login/register/SSO | Капча, Yandex на ty; py без Yandex (parity) |
| Кабинет | `/dashboard/*` | Логика хабов ок; хром через boot-костыль; overview облегчён |
| Сообщения | `/dashboard/messages` | **P0 UX закрыт на ty** (hdr45/boot6 + soft poll); split page — дальше |
| Админка | `/admin/*` | Очереди сгруппированы; тяжёлые страницы |
| Ops | диск/RAM/Docker | диск после prune ~79%; RAM ~1.9G — один rebuild за раз |

---

## P0 — чинить первыми

### 1. Ёмкость VPS
- Диск **91%** (~2.7G), Docker build cache **~4G** reclaimable.
- RAM **1.9G** → OOM/502 при параллельных rebuild.
- **Задачи:** `docker builder prune`; ротация логов; не держать 2 rebuild сразу; перед build — `stop web` + prune; мониторинг `df`/`free`.

### 2. Сообщения (диалоги) — сделано на ty
Симптомы закрыты: композер виден, последние над ним, скролл вверх живой, rail/док в треде не мешают.

Сделано: `theme.css` hdr43–45, `messages-boot.js` v6, `CabinetShell` без strip на messages, pin on open/new, soft poll 12s, бренд лайм/море. QA mobile PASS (см. `MESSAGES_FIX_TY.md`).

Остаток (не P0): split монолита page.

### 3. Хром кабинета (системно) — сделано на ty
React `CabinetTopBar` (`yp-react-cab-chrome`) + `BottomNav` на `/dashboard`/`/profile`; `header-boot` не inject’ит при React chrome. Messages/edit immersive. QA PASS — см. `CABINET_CHROME_TY.md`.

### 4. Холодная главная — следующий P0
`/` TTFB до ~2.5s (прогрев).  
**Задачи:** проверить ISR/cache headers; не блокировать TTFB на тяжёлых server fetch; hero mobile `<picture>` в образе (раньше отставал от src).

---

## P1 — высокий приоритет

### 5. Кабинет: вес и IA
- `DashboardClient` ~1372 строк на me/edit всё ещё тяжёлый.
- Overview уже вынесен в лёгкий клиент + lazy QR (`DASHBOARD_MODERN_TY.md`) — довести me/settings.
- Один слой навигации: рельса хабов **или** сайдбар; без третьего ряда табов.
- Настройки: карточки-группы (публичность / безопасность / согласия / мессенджеры) — уже каркас, вычистить плотность.

### 6. CSS-долг и перф
- ~934 KB CSS суммарно (`globals` + unify + brand).
- `backdrop-filter` / анимации на mobile → jank.
- **Задачи:** выкинуть мёртвые правила; cabinet/messages без blur; `content-visibility` на длинных списках; не плодить hdrN-оверлеи без чистки хвоста.

### 7. Auth / parity py↔ty
- py без Yandex SSO (merge `oauthSsoJson` только на staging-исходнике в старых аудитах).
- Проверить `/cookies`, `/profile` редиректы на обоих контурах.
- SMS/ESIA флаги enabled без ready — не показывать мёртвые кнопки.

### 8. Админка
- Группа «Очереди» (брони, заявки, жалобы, регистрации) — ок.
- `admin/settings` ~1777 строк — разбить.
- KPI регистраций — живой count (не 0).
- Модератор с `moderation` уже видит pending-users — регрессионный тест ролей.

### 9. Static→dynamic / Prisma
- Ранее: privacy/terms `headers()` ломали static; таймауты Prisma на staging.
- **Задачи:** убрать `headers()` из static path; connection pool / statement timeout; не логировать шум в prod.

---

## P2 — средний

### 10. Контент и пустые разделы
- Галерея/гранты/афиша: либо контент, либо скрыть пункт меню.
- Дубль заголовка «Чаты» на mobile.

### 11. Монолиты (рефактор)
| Файл | строк | Действие |
|------|------:|----------|
| `globals.css` | ~32k | модули / purge |
| `messages.css` | 2336 | trim + tokens |
| `dashboard/messages/page.tsx` | 1436 | split |
| `DashboardClient.tsx` | 1372 | только me/edit |
| `Navbar.tsx` | 1156 | split guest/auth |
| `admin/settings/page.tsx` | 1777 | tabs/routes |
| `as any` | ~155 | постепенно |

### 12. Безопасность / качество
- CSP с `'unsafe-inline'` (вынужденно Next) — не расширять.
- IDOR-проход авторизованным пользователем по `/api/messages`, bookings, profile.
- Role E2E: USER / MODERATOR / ADMIN / SCANNER / TECH (см. `ROLE_E2E_TY.md`).

### 13. DX агентов
- Fast path: CSS через `/public/brand` + `brand-bump.sh`, без Docker ради стилей.
- Один rebuild за раз; лог в `/opt/cursor-agent`.
- Docs-only GitHub; код на VPS.

---

## Порядок спринтов (задачи)

### Спринт A — стабильность (1 проход, ty)
1. [ ] Prune Docker / освободить ≥6–8G  
2. [ ] Messages: высота + один док + scroll-to-bottom (CSS/boot → потом TSX)  
3. [ ] Проверка composer над доком на iOS/Android ширине 390  
4. [ ] Не копировать на py  

### Спринт B — хром и кабинет
1. [ ] Убрать зависимость от `yp-cab-chrome` inject (React chrome)  
2. [ ] Дожать me/settings группировку и вес  
3. [ ] Регрессия SCANNER/TECH личных маршрутов  

### Спринт C — перф публички
1. [ ] Главная TTFB / hero mobile в образе  
2. [ ] Проредить CSS; убрать blur с cabinet/messages  
3. [ ] Пустые разделы: контент или hide  

### Спринт D — parity и админка
1. [ ] Yandex SSO на py после «одобряю»  
2. [ ] Split admin settings; живые KPI  
3. [ ] Role E2E + точечный IDOR  

### Спринт E — рефактор долга
1. [ ] Split messages/DashboardClient/Navbar  
2. [ ] Снизить `any` на горячих API  
3. [ ] Обновить audit-скрипт под актуальные hdr/hero/cookies  

---

## Критерии готово

- Сообщения: открыл тред → видны **последние**; скролл пальцем; композер над доком; после send — прыжок вниз.  
- Кабинет: шапка + нижнее меню без boot-хака; один слой разделов; без лагов на списке записей.  
- VPS: диск &lt; 80%, один успешный staging rebuild без OOM.  
- py без изменений, пока нет явного «одобряю».

## Уже сделано недавно (не повторять вслепую)

- Staff unify: очереди админки, хабы кабинета, moderation+pending.  
- Cabinet chrome boot hdr40–42.  
- Dashboard overview light + lazy QR.  
- Gallery/afisha seed, guest vacancies, register aria — см. соседние `*_TY.md`.
