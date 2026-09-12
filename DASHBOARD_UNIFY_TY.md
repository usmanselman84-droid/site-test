# ty: единый кабинет под активного переписчика

Аудит по скринам пользователя + live ty: кабинет уже́же/левее главной, кнопки pill vs radius-10, `--primary: #8562d8` (лаванда) против бренда лайм/море, CLS при загрузке, сообщения не ощущаются как «рабочее место общения».

## Продуктовая модель (человек много пишет)

Кабинет = **два режима**:
1. **Жизнь** — записи, билеты, профиль, витрина (контент в общем shell).
2. **Общение** — чаты как отдельное приложение внутри кабинета (full-height, композер всегда доступен).

Нижний док (mobile): Главная · Поиск · **Чаты** · Друзья · Профиль.  
Чаты — центр тяжести; бейдж непрочитанных обязателен.

### IA маршрутов
| Зона | Пути | Поведение |
|------|------|-----------|
| Хаб жизни | `/dashboard`, записи, билеты, заявки | shell + сайдбар; ширина = `--yp-shell` как на главной |
| Профиль | `/dashboard/me`, витрина, портфолио | тот же shell; без «узкой колонки» |
| Настройки/edit | `/dashboard/settings`, `/dashboard/edit` | immersive form, те же кнопки |
| Общение | `/dashboard/messages` | **без** сайдбар-strip; 2 колонки desktop; mobile тред = 100dvh − header − composer |
| Друзья | `/dashboard/friends` | shell; CTA «написать» → messages |

## Дизайн-токены (выровнять с главной)
- Лайм `#afca03` — CTA / send / active chip  
- Море `#0a7aa8` / `#06344a` — primary UI (вместо лаванды `#8562d8`)  
- `--yp-shell: 72rem` — одна ширина контента  
- CTA: `border-radius: var(--radius-pill)`  
- Карточки/табы: `var(--radius-md)` (не mix 10px / 999 / 50%)  
- Отступы: `gap` 0.75–1rem, без «карточка слева + пустота справа»

## P0 на ty — сделано
1. `--primary` → море `#0a7aa8` (globals + theme hdr48–50).  
2. CSS unify: shell = главная; CTA pill; kill purple в nav/admin.  
3. Messages: `dashboard-page--messages` без aside; mobile thread 100dvh + sticky composer; dock скрыт.  
4. Staging rebuild healthy; QA: width PASS, messages write/scroll PASS; purple добито hdr50.

## P1
- Split `messages/page.tsx` монолита.  
- Unread badge в доке «Чаты».  
- Ускорение `/dashboard` data (меньше waterfall / CLS).  
- Выровнять radius табов «Сейчас/История» с CTA (уже частично).

py не трогать без «одобряю».
