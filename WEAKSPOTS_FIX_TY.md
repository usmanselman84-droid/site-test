# Исправления слабых мест — ty (2026-09-12)

Контур: **только ty** (`ty.idivles.ru`, `/opt/sochi-portal-staging`). py не трогали.

## Что сделано

| # | Было | Стало |
|---|------|-------|
| P0 | Ghost cabinet URLs (`/dashboard/favorites\|orders\|points\|profile/edit`) | 307 → `/dashboard/me`, `/shop`, `/shop`, `/edit` |
| P0 | `/shop`, `/achievements`, `/opportunities`, `/staff` → 404 | 307 → cabinet / grants / admin |
| P0 | `/awards` 404 | Публичный хаб с H1 + CTA в кабинет |
| P0 | `/portfolio` пустая оболочка у гостя | Лендинг с H1 + вход/регистрация (авториз. → `/dashboard/portfolio`) |
| P0 | `/contests`, `/vacancies` без карточек в HTML | SSR `initialItems` → в HTML сразу карточки |
| P1 | `/coworking` title «… \| Бренд \| Бренд» | `title: 'Запись в коворкинг'` + template один раз |
| P1 | `/privacy`, `/terms`, `/rules` два H1 | Убран ведущий `#` из MDX (остаётся H1 из `LegalDocShell`) |

## Проверка после деплоя

```
/awards          200  H1=Награды
/portfolio       200  H1=Портфолио
/coworking       title без дубля бренда
/privacy|terms|rules  ровно 1× H1
/contests        cards≥1 в HTML без JS
/vacancies       cards≥1 в HTML без JS
/dashboard/favorites → login?callbackUrl=/dashboard/me
```

Staging image: `sochi-staging_web:latest`, контейнер healthy на `:3001`.

## Не в этом проходе

- Онбординг пустого inbox / densify кабинета (отдельные ветки)
- Cold TTFB главной, CSS-долг
- Копирование на **py** — только после «одобряю»
