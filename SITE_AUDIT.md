# Полный аудит YoungPortal

Скрипт на VPS: `/opt/cursor-agent/scripts/audit-youngportal.sh [ty|py|both]`

Запуск: `bash /opt/cursor-agent/scripts/audit-youngportal.sh both`  
Отчёт: `/tmp/yp-audit-*/report.md`, `summary.json`, `scores.json`

## Прогон 2026-09-10

**Overall: 85 / 100** (strong)

| Измерение | Балл |
|-----------|------|
| Availability | 94 |
| Security headers | 100 |
| UX shell | 90 |
| Auth/SSO | 67 |
| Ops capacity | 60 |

### Честно

**Сильно:** ty/py живые и быстрые; все публичные маршруты 200; кабинет редиректит на login; HSTS/CSP; контейнеры healthy; на ty Яндекс SSO живой.

**Слабо:** на py нет OAuth (образ без SSO из DB); VK/Telegram не настроены; диск 84%; RAM ~0.6GB free — риск OOM/502 при rebuild.

**Не покрыто скриптом (вручную):** визуал главной/солнце, клики Назад в edit, UX капчи, реальный login паролем, мобильный dock.
