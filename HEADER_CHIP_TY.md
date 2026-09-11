# ty: шапка — чип кабинета (hdr29)

Только `/opt/sochi-portal-staging`. **py / prod не копировали.**

## Что не так было
hdr28 оставил круглую Lucide `circle-user` 40px (бледно-голубой силуэт). Скрин пользователя.

## Что сделано
- CSS: Lucide в триггере скрыт; вместо круга — компактный чип 34px, море `#06344a`, лайм `#afca03`.
- JS (`header-boot.js?v=15`): фото из `/api/user/profile` → иначе инициалы → иначе «Кабинет». Гость: чип «Войти» (если триггер виден).
- Кэш: `theme.css?v=hdr29`, `header-boot.js?v=15`.

Hard-refresh: Ctrl+Shift+R на https://ty.idivles.ru
