# ty: мобильное меню скроллится (hdr31)

Только `/opt/sochi-portal-staging`. **py / prod не копировали.**

## Что не работало
Шторка обрезалась на «Новости»: `body.mobile-nav-open { touch-action: none }` блокировал жест, нижние разделы (вакансии, гранты, контакты) были недоступны. Карточка профиля — сиреневый CTA и Lucide-кружок.

## Что сделано
- `theme.css?v=hdr31`: `touch-action: pan-y` + `overflow-y: auto` на `.mobile-menu`; поиск снова виден; карточка профиля в цветах моря/лайма.
- `header-boot.js?v=17`: фото или инициалы вместо generic UserCircle.
- `globals.css`: `touch-action: pan-y` (эффект после rebuild).

Hard-refresh на телефоне: https://ty.idivles.ru — открыть меню и прокрутить ниже «Новости».
