# ty: системный хром кабинета (вместо header-boot inject)

## Проблема
`HideOnPaths` размонтирует `Navbar`/`BottomNav` на `/dashboard` и `/profile`.
`header-boot.js` вставляет `.yp-cab-chrome` (шапка + док) — хрупко, двойной padding, гонки с messages-boot.

## Цель (ty only)
1. React `BottomNav` на всём кабинете (кроме immersive edit; тред messages — CSS hide dock).
2. React `CabinetTopBar` вместо inject-шапки.
3. `header-boot` не inject, если есть `.yp-react-cab-chrome`.
4. Замер `--yp-bottom-nav-h` в `BottomNav` (ResizeObserver).
5. py не трогать.

## Статус
В работе.
