# ty: мобильное меню реально скроллится (hdr33)

Только `/opt/sochi-portal-staging`. **py / prod не копировали.**

hdr31 не хватило: список всё ещё обрезался на «Новости».

## Почему
- Нижний док `.yp-bottom-nav` (`z-index: 1000`) лежал поверх шторки (`z-index: 199`) и перехватывал жест.
- Flex: `.mobile-menu__nav { min-height: 100% / auto }` не давал внутреннему скроллу.
- Поиск прятался `html.has-bottom-nav .mobile-menu__search { display:none }` в `header-critical.css`.

## Что сделано
- `theme.css?v=hdr33`: док скрыт при `mobile-nav-open`; шторка `z-index: 50000`; скролл на `__nav` с `min-height: 0`.
- `header-critical.css?v=6`: поиск снова `display:flex`.
- `header-boot.js?v=18`: inline overflow на открытом меню.
- `globals.css`: тот же flex-скролл (после следующего rebuild).

Hard-refresh на телефоне: открыть меню, прокрутить ниже «Новости» до вакансий / грантов / контактов.
