# Tap/click без обводки формы — ty (hdr25)

Жалоба: при тапе/клике по кнопкам **подсвечивается форма** (iOS tap-flash, фиолетовое/серое кольцо, заливка `:active`). Нужны чистые нажатия.

Сделано **только на ty.idivles.ru** (`/opt/sochi-portal-staging/public/brand/theme.css`). **py / prod public не копировали.**

## Что изменилось

1. **nginx** (общий сниппет `yp-proxy.conf`): query `theme.css?v=hdr24` → **`hdr25`**.  
   py тоже получает новый `?v=`, но отдаёт **свой** `public/brand/theme.css` без этих правил.
2. **CSS hdr25** (ty):
   - `-webkit-tap-highlight-color: transparent` на `html, body, a, button, *`
   - `outline: none` на кнопки/ссылки; **`:focus-visible`** — тонкая лаймовая обводка `#afca03`, не фиолетовая
   - `:active` без blob/box-shadow на `.nav-icon-btn`, `.mobile-menu-btn`, chips, hero CTA, pills, `.btn`
   - иконки шапки/меню: белый фон + лаймовая рамка `#dce8a8`, фон мобильного меню `#f4f7ee` вместо iOS `#f2f2f7`

## Проверка

```
ty HTML:  /brand/theme.css?v=hdr25
ty CSS:   содержит tap-highlight
py CSS:   hdr25 в файле нет (0 совпадений tap-highlight)
```

nginx reload выполнен. Docker rebuild не нужен (CSS-only).
