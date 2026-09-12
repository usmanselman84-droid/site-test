# header-boot 503 storm — ty (2026-09-12)

## Что видели в консоли

- `header-boot.js?v=22` бесконечно вызывал `GET /api/user/profile` → **503**
- Чанки Next `/_next/static/chunks/...` тоже 503
- Аватар из `/uploads/avatars/...` 503

## Почему

Старый boot вешал **MutationObserver** на весь документ и на каждое изменение DOM снова ходил в `/api/user/profile`. Nginx на ty ограничивает соединения (`limit_conn`). Шторм запросов забивал лимит — origin начинал отвечать **503**, включая статику.

`/brand/*.js` отдавался как `Cache-Control: immutable, 30 дней`, поэтому браузер продолжал крутить **v=22** даже после выкладки нового файла.

## Что сделано на ty

| Мера | Деталь |
|------|--------|
| `ypLoadProfile()` | один inflight, кэш 60 с, при 5xx пауза 30 с, без сессии запроса нет |
| Observer | больше не делает fetch, только рисует из кэша |
| `fetch-guard.js?v=1` | первым в `<head>` — режет повторные profile-запросы даже у закэшированного v=22 |
| HTML | `header-boot.js?v=28` |
| nginx | boot/guard `max-age=60, must-revalidate` (не immutable) |
| `limit_conn` | 40 → 80 |

Сейчас `/api/health` и чанки — **200**. Нужен **жёсткий refresh** (или закрыть вкладку), чтобы выгрузить v=22 из памяти.

py не трогали.
