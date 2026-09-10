# Профиль (мобилка) и TECH `/ops`

## Почему TECH оказывался на Главной

В **запущенном** образе Next гость на `/ops` уходит на `/` (старый proxy). Флаг `mustChangePassword` в JWT — это то, что в минифицированном бандле выглядит как проверка пароля (`hasPassword` / смена пароля). Он **не должен** отрезать TECH от `/ops`.

Сделано:

- В исходнике `proxy.ts`: `/ops` и `/api/ops` не блокируются сменой пароля; иначе редирект на `/change-password?next=/ops`.
- После логина TECH сразу идёт на `/ops` (или на смену пароля с `next=/ops`).
- На **ty.idivles.ru** Nginx: без сессии `/ops` → `/login?callbackUrl=/ops&staff=1` (проверка: `302`, не главная).
- В БД TEST у TECH уже `mustChangePassword = false` и пароль задан.

Полный эффект `proxy.ts` / логина — после rebuild staging-образа.

## Редактирование профиля

Живой CSS `theme.css?v=hdr11` + `header-boot.js?v=8`:

- Правка не закрывается свайпом при прокрутке; «Закрыть / Сохранить» — крупные кнопки 48px.
- Иконка профиля убрана из шапки (вкладка «Профиль» только в нижнем доке).
- Меню: сетка разделов, без дублей «Самоуправление / Добро / Гранты».
- Панель: без иконки профиля в моб.баре и без подписи Ctrl+K на телефоне.
- Карточка профиля: имя не обрезается, шестерёнка круглая.

Исходник TEST (после rebuild): `MobileSheet dismissible={false}` на intercept правки.

## Прочее

- `navigator.credentials.store` только при `window.isSecureContext`.
- В `next.config.ts` (staging source) — `splitChunks.cacheGroups.lucide` (эффект после сборки).
