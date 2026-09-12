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

## Добивка после аудита (hdr44 / boot v6)
- MutationObserver больше **не** force-pin при каждом paint — скролл вверх снова живой; pin только при открытии треда или новом пузыре у низа.
- `setQuery` → `/dashboard/messages?...` (без редирект-ремаунта через `/messages`).
- Desktop inbox: 2 колонки сохранены; док скрыт только в `is-thread`.

## Добивка hdr45 + soft poll (2026-09-12)
- `theme.css?v=hdr45`: бренд лайм/море на send/accent; добивка hide dock-space в треде.
- `messages.css`: `--msg-accent` море `#0a7aa8`, `--msg-mine` лайм `#afca03` (не фиолетовый).
- Soft poll открытого треда: `setInterval(..., 12000)` + `soft: true` (без лоадеров/ремаунта); tick при `visibilitychange → visible`.
- Rebuild staging `sochi-staging-web-1` — healthy; live: `theme.css?v=hdr45`, `messages-boot.js?v=6`.
- VPS: перед rebuild prune builder; после — диск ~79% (был 100% на export).

### QA (ty mobile ~390)
| Проверка | Результат |
|----------|-----------|
| Inbox: док виден, rail скрыт, скролл | PASS |
| Тред: композер виден, последнее над ним | PASS |
| Тред: док не перекрывает ввод | PASS |
| Скролл вверх по истории (не force-pin) | PASS |
| Акценты лайм/море | PASS |

Сиды для QA: DM `user@sochi.ru` ↔ `part@sochi.ru` (только staging).

## Что ещё может остаться
- Монолит page ~1.4k строк — split `ThreadList` / `ThreadView` / `Composer`.
- Один владелец дока (React chrome вместо boot inject) — см. SITE_FULL_PLAN P0.3.
- Desktop split на очень узких ширинах.
- Уведомления / read-receipts отдельно от layout.
