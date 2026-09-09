# Кабинет vs витрина: что уже было и что сделано

Согласен с тремя уровнями. На стейдже (`/opt/sochi-portal-staging`) это закрыто **без** переезда всех 70 `page.tsx` в `(marketing)/(cabinet)/(admin)` — такой перенос ломает ISR корневого `layout.tsx` и требует полный `next build` (на VPS 2 ГБ часто не влезает). Эквивалент route groups сейчас такой:

| Группа | Как сделано |
|---|---|
| Витрина | Корневой layout: Navbar + Footer + BottomNav |
| Кабинет | `CabinetShell` (сайдбар) + chrome витрины **не монтируется** |
| Админка / Ops / Scanner | `AdminLayoutClient` / ops shell + `body.is-admin` |

Контейнер `sochi-staging-web-1` собран из **standalone** и **не монтирует** `src/`. Правки на диске вступят после `apply-staging` / пересборки образа. **Прод не трогали.**

---

## Почему `/ops` отдавал главную

В `src/proxy.ts` было:

```ts
if (pathname.startsWith('/ops')) {
  if (!token || !isTechRole(role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
```

Скрипт без cookie JWT (или с ролью ≠ TECH) получал **302 на `/`** — в DOM те же слайдеры витрины. Это не «сломанный TECH», а редирект гостя на маркетинг.

**Исправление (в исходниках стейджа):** нет токена → `/login?callbackUrl=/ops`; есть сессия, но не TECH → `/dashboard`. Живой бинарь пока со старым middleware, пока не пересоберёте.

После логина TECH `getServerSession` + `isTechRole` по-прежнему рисуют Ops. `CabinetShell` с `/dashboard` уводит TECH на `/ops`.

---

## Логическое разделение

Уже было: `/dashboard` (overview) и `/dashboard/settings` (пароль, публичность, мессенджеры).

Сейчас в сайдбаре:

- **Рабочий стол** → `/dashboard` (брони, QR, баллы — как было в overview)
- **Настройки** → `/dashboard/settings`
- **`/profile`** → redirect на `/dashboard/settings` (`next.config.ts`)

Пункт «Профиль» переименован, чтобы не путать стол и анкету.

---

## Визуальное (App Shell)

Раньше `HideOnPaths` прятал шапку/подвал только на login/register/…. На `/dashboard` витрина оставалась в DOM (админка пряталась CSS `is-admin`).

Теперь префиксы скрытия: `/dashboard`, `/profile`, `/admin`, `/ops`, `/scanner`.  
`StaffChrome` вешает `is-cabinet` на кабинет.  
`cabinet-app-shell.css`: запасное `display:none` для nav/footer + **min 44×44** на кнопки кабинета/админки на coarse pointer.

Boot-скрипт считает `/dashboard` immersive — без нижнего публичного дока.

---

## Техническое (App Router)

Полные Route Groups — следующий деплой-эпик: вынести `page.tsx` главной/афиши в `(marketing)`, кабинет в `(cabinet)` с отдельным `layout.tsx` без Footer. Сейчас два layout уже есть (`dashboard/layout.tsx`, `admin/layout.tsx`); не хватало отключения корневого chrome.

---

## Мелкие кнопки

CSS `min-width/min-height: 44px` для кнопок `.dashboard-page` / `.admin-layout` / `.ops-page-shell` при `(pointer: coarse)`. После пересборки проверить шапку 36px — она жила в **публичном** `glass-nav`; в кабинете её не должно быть.
