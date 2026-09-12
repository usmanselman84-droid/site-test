# ty: системный хром кабинета (вместо header-boot inject)

## Проблема
`HideOnPaths` размонтировал `BottomNav` на `/dashboard` и `/profile` (кроме messages).
`header-boot.js` вставлял `.yp-cab-chrome` (шапка + док) — хрупко, гонки с messages-boot.

## Фикс (ty only)
1. `CabinetTopBar.tsx` — React-шапка кабинета (класс `yp-react-cab-chrome`), без messages/edit.
2. `layout.tsx` — `exceptPrefixes={['/dashboard','/profile']}` для `BottomNav` + space.
3. `BottomNav.tsx` — immersive на edit; `ResizeObserver` → `--yp-bottom-nav-h`.
4. `header-boot.js` — если есть React chrome / React dock, только wipe legacy inject, без повторной вставки.
5. py не трогали.

## Deploy
- brand-bump header-boot (+ theme hdr47 как побочный bump скрипта)
- `docker compose … up -d --build web` на staging

## QA
- `/dashboard`, `/dashboard/me`: React header + React dock, нет двойного `.yp-cab-chrome` inject — **PASS**
- `/dashboard/messages` тред: без marketing header; dock скрыт CSS; композер ок — **PASS**
- `/dashboard/edit`: immersive без dock — (по коду; smoke отдельно)
