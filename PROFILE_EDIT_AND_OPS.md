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

Живой CSS `theme.css?v=hdr5` + `header-boot.js?v=3` (`html.is-cabinet` на `/dashboard`):

- Один скролл, на мобилке скроллбары скрыты.
- Кнопки «Закрыть» / «Сохранить» с отступом над доком (`pb` ≈ 6.5rem + высота таб-бара).
- Убраны хваталка шторки (`.yp-vaul-handle` / grab) и маркеры `<details>` над заголовком.
- Знак зодиака — бейдж, не голая фиолетовая строка.
- Инпуты: белый фон и явная рамка `#b9b1d1`.

## Прочее

- `navigator.credentials.store` только при `window.isSecureContext`.
- В `next.config.ts` (staging source) — `splitChunks.cacheGroups.lucide` (эффект после сборки).
