# Phone cabinet / chrome / login — ty (2026-09-12)

Контур: **только ty** (`ty.idivles.ru`, `/opt/sochi-portal-staging`). py не трогали.

## Жалобы (телефон)

- Вход долго грузит / сайт «странно» работает после логина
- Панель профиля — много пустот
- Сообщения ломаются
- Шапка сайта не везде
- Dashboard UI сломан

## Корневые причины

1. **Шапка:** `HideOnPaths` прятал Navbar на `/dashboard` и `/profile`; stub `CabinetTopBar` был пустым/null на messages; `header-boot.js` инжектил фейковый chrome и дрался с React.
2. **Логин:** `finishLogin` ждал `pingSecurity('LOGIN')` (fingerprint) до редиректа.
3. **Пустоты:** большие mobile padding/gaps/cover в cabinet/profile CSS.
4. **Сообщения:** вложенный `CabinetShell` (`container` + `dashboard-layout`) ломал full-bleed `is-thread` на мобилке.

## Что сделано на ty

| Область | Изменение |
|--------|-----------|
| `HideOnPaths` | Navbar снова на `/dashboard` и `/profile`; footer по-прежнему скрыт в кабинете (`extraPrefixes`) |
| `CabinetTopBar` | stub → `null` (источник правды — Navbar) |
| `CabinetShell` | messages = full-bleed без nested layout |
| Login | fingerprint non-blocking: `void import(...).then(m => m.pingSecurity('LOGIN'))` |
| `theme.css` | densify + header visibility + messages bleed (`?v=hdr53`) |
| `header-boot.js` | после wipe/mark — **без** inject дубликата (`?v=22`) |
| nginx `yp-proxy.conf` | `theme.css?v=hdr53`, `header-boot.js?v=22` |

## Проверка

- `/api/health` → 200, контейнер healthy
- `/login` → 200; `/dashboard*` без сессии → redirect login (ожидаемо)
- Live HTML тянет `theme.css?v=hdr53` и `header-boot.js?v=22`
- Вручную с телефона (hard-refresh): вход быстрее; шапка на desk/me; меньше пустот; чат → тред

## Не в этом проходе

- Полный split messages monolith / unread badge
- 2FA/challenge latency на логине (отдельно от fingerprint)
- Копирование на **py** — только после «одобряю»
