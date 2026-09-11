# ty: фикс диалогов (композер / скролл / последние)

Скрин: в треде нет поля ввода, низ сообщений под доком, сверху лишняя рельса хабов кабинета, не листается.

## Корни
1. Поздний `theme.css` (hdr41) снова включал `.cabinet-rail-strip { display:grid !important }` на messages — рельса «Моя страница / Общение / …» съедала высоту.
2. `CabinetShell` всегда рисовал strip на mobile, в том числе на `/dashboard/messages`.
3. Нижний `yp-bottom-nav` поверх композера: тред на 100dvh без вычета дока → `.messages-composer` уезжал под док (на скрине его не видно).
4. Скролл к последним срабатывал слабо при битой высоте (`nearBottom` никогда не true).

## Фикс (ty only)
- `theme.css?v=hdr43`: скрыть rail/aside на messages; flex-цепочка высоты; в **открытом треде** спрятать site-dock (как Telegram); композер снова visible; inbox с padding под док.
- `messages-boot.js?v=5`: класс flow, замер `--yp-bottom-nav-h`, pin вниз при треде, прятать док в треде.
- `CabinetShell.tsx`: не рендерить strip на `/dashboard/messages`.
- `messages/page.tsx`: жёсткий pin при открытии треда / новых сообщениях.

Rebuild staging для TSX; CSS/boot уже на nginx. **py не копировали.**

## Что ещё может остаться
- Монолит page ~1.4k строк / тяжёлый poll.
- Фиолетовый акцент в `messages.css` vs бренд лайм.
- Список чатов + тред desktop split на узких ширинах.
- Уведомления / read-receipts отдельно от layout.


## Добивка после аудита (hdr44 / boot v6)
- MutationObserver больше **не** force-pin при каждом paint — скролл вверх снова живой; pin только при открытии треда или новом пузыре у низа.
- `setQuery` → `/dashboard/messages?...` (без редирект-ремаунта через `/messages`).
- Desktop inbox: 2 колонки сохранены; док скрыт только в `is-thread`.
