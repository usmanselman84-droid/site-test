# Полный аудит YoungPortal

Скрипт на VPS: `/opt/cursor-agent/scripts/audit-youngportal.sh [ty|py|both]`

Запуск: `bash /opt/cursor-agent/scripts/audit-youngportal.sh both`  
Отчёт: `/tmp/yp-audit-*/report.md`, `summary.json`, `scores.json`

## Прогон 2026-09-10 (вечер, повтор)

**Overall: 84 / 100** — см. детальный разбор изъянов в [`FULL_SITE_AUDIT.md`](./FULL_SITE_AUDIT.md).

| Измерение | Балл |
|-----------|------|
| Availability | 94 |
| Security headers | 100 |
| UX shell | 90 |
| Auth/SSO | 67 |
| Ops capacity | **28** |

### Честно

**Сильно:** ty/py живые; публичные маршруты 200; HSTS/CSP; контейнеры healthy; на ty Яндекс SSO живой; brand `hdr22`.

**Слабо:** диск **88%**, RAM ~250MB avail; py без OAuth; hero mobile в src есть, в Docker-образе нет; `/cookies` 404; `/profile` на py 404 (на ty → settings); Next static→dynamic на privacy/terms.

**Не покрыто скриптом (вручную):** Accept cookie, клики Назад в edit, капча, реальный login, dock Чаты.
