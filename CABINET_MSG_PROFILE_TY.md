# Cabinet / messages / shop / docs / games — ty (2026-09-12)

Контур: **только ty** (`ty.idivles.ru`, `/opt/sochi-portal-staging`). py не трогали.

## Жалобы

- Dashboard / профиль «не тронуты», «Открыть профиль» ведёт не туда
- Сообщения: клик по человеку → «Выберите диалог» / белый экран
- React #418 (hydration)
- Магазин: слот «Голос интерфейса» непонятен
- Документы: не открываются с первого раза, нужно компактнее
- Игры долго грузятся

## Что сделано на ty

| Область | Изменение |
|--------|-----------|
| Сообщения (клик в списке) | Optimistic `setActiveUser` / `setSelectedId` до fetch → сразу `is-thread` на мобилке |
| Сообщения (`?with=` / `?c=`) | Optimistic вход в тред из inbox до ответа API (друзья / профиль «Написать») |
| Сообщения (клубы/проекты) | Optimistic `setActiveGroup` при клике |
| `messages-boot.js` | Только классы + scroll pin; **без** `remove()` React DOM (причина #418 / белый экран) |
| Профиль в меню | `profileHref` → `/dashboard/me` (раньше был `/dashboard`) |
| Магазин | Слот «Стиль текстов (голос UI)» + подсказка: меняет формулировки UI, не микрофон |
| Документы | `force-dynamic` на `[id]`, компактный CSS, `prefetch={false}` |
| Игры | `GameHallOfFame` через `dynamic(..., { ssr: false })` |

## Проверка

- `/api/health` → 200, контейнер healthy
- `/documents`, `/games` → 200
- `/brand/messages-boot.js` — без DOM `remove()`
- В бандле: «Стиль текстов», `dashboard/me`
- Вручную: Чаты → клик по диалогу → тред; меню → «Открыть профиль» → `/dashboard/me`

## Не в этом проходе / шум

- `startTime` в консоли — DevTools Performance (VM), не приложение
- Полный densify кабинета / unread badge / welcome-bot — отдельно
- Копирование на **py** — только после «одобряю»
