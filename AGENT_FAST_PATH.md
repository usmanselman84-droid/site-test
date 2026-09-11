# Fast path для Cloud Agents (ty)

Цель: меньше токенов и минут. **Не** делать полный Next Docker rebuild ради CSS.

VPS: `/opt/cursor-agent/FAST_PATH.md`, скрипт `scripts/brand-bump.sh`.

## По умолчанию — только live-файлы

Правки визуала на **ty.idivles.ru**:

- `/opt/sochi-portal-staging/public/brand/theme.css`
- `/opt/sochi-portal-staging/public/brand/header-boot.js`

Отдаёт nginx `/brand/`. Кэш: `?v=` в `/etc/nginx/snippets/yp-proxy.conf` (сниппет **общий с py**).

После правки CSS/JS:

```bash
bash /opt/cursor-agent/scripts/brand-bump.sh "что поменяли"
```

Бампит только `theme.css?v=hdrN`. **Не копировать CSS на prod.** py не трогать, пока пользователь не напишет **одобряю**.

## Никогда

- `docker compose build` / rebuild ради CSS, tap-highlight, hero overlay, шапки.
- Полный site-audit скрипт (`audit-youngportal.sh` и аналоги), если не просили.
- Два параллельных `computerUse`.
- Дамп docker logs / webpack в чат.

## Staging rebuild

Только если **нужно** менять `src/` (TSX / TS API), и пользователь это хочет.

1. `docker builder prune` (освободить RAM).
2. Один сервис: `sochi-staging`.
3. Не трогать py.

## Проверка

`curl` + **один** скрин, если нужен визуальный proof. Не гонять полный браузерный аудит «на всякий случай».
