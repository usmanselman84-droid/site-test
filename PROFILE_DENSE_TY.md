# ty: пустоты и «тупит» на /dashboard/me

## Симптом
Скрин: хабы «Страница/Общение/…» видны, ниже огромные серые пустоты (скелетон), страница долго висит.

## Корни
1. `CabinetShell` при `status==='loading'` **выкидывал children** и рисовал `.svc-skel` с нашим CLS-костылём `min-height: 28rem` → визуальная дыра.
2. `DashboardClient` ждал session/profile API до отрисовки hero.
3. Высокие `.svc-skel__row` (4.5rem) + большие gap.

## Фикс (ty)
- `CabinetShell`: всегда рендерит `children` (скелетон только внутри страницы).
- `DashboardClient`: seed профиля из session сразу; compact `profile-boot-skel` (cover+avatar+stats).
- `theme.css?v=hdr51`: убрать 28rem, densify skel/hub gaps.

Rebuild staging обязателен для TSX.
