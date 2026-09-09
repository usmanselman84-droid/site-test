# Отчет по настройке и изоляции серверов PROD и TEST

Сервер: `77.110.125.241`

## Архитектура разделения контуров

| Параметр | 🟢 PROD (Боевой релиз) | 🟡 TEST / STAGING (Тестовый) |
| :--- | :--- | :--- |
| **Домен** | `py.idivles.ru` | `ty.idivles.ru` |
| **Порт приложения** | `127.0.0.1:3000` | `127.0.0.1:3001` |
| **Директория проекта** | `/opt/sochi-portal` | `/opt/sochi-portal-staging` |
| **База данных PostgreSQL** | `sochi_portal` | `sochi_staging` |
| **Хранилище загрузок (/uploads)** | `/opt/sochi-portal/public/uploads` | `/opt/sochi-portal-staging/public/uploads` |
| **Контейнер / процесс** | `sochi-portal-web-1` (Docker Compose) | `sochi-staging-web-1` (Docker Compose) |
| **Конфигурация Nginx** | `/etc/nginx/sites-available/py.idivles.ru` | `/etc/nginx/sites-available/ty.idivles.ru` |
| **SSL сертификаты** | Let's Encrypt (`py.idivles.ru`) | Let's Encrypt (`ty.idivles.ru`) |

## Выполненные работы

1. **Аудит системы и процессов**:
   - На сервере приложения упакованы в контейнеры Docker Compose с привязкой к портам localhost.
   - Исходно оба контура смотрели в одну и ту же базу данных `sochi_portal` и общую папку `/uploads`.
2. **Полная изоляция баз данных**:
   - Создана независимая база данных PostgreSQL `sochi_staging` (владелец `sochi`).
   - Все таблицы, последовательности и текущее состояние скопированы в `sochi_staging`.
   - В `/opt/sochi-portal-staging/.env` значение `DATABASE_URL` перенаправлено на `sochi_staging`.
   - Проведена верификация: запись тестовой строки в `sochi_staging` не затрагивает боевую БД `sochi_portal`.
3. **Изоляция пользовательских файлов (/uploads)**:
   - Для стейджинга выделена собственная директория `/opt/sochi-portal-staging/public/uploads`.
   - Тестовые загрузки не перезаписывают файлы продакшена.
4. **Разделение портов и сервисов**:
   - PROD работает на `127.0.0.1:3000` (`sochi-portal-web-1`).
   - TEST работает на `127.0.0.1:3001` (`sochi-staging-web-1`).
5. **Раздельные конфигурации Nginx**:
   - Создан отдельный виртуальный хост `/etc/nginx/sites-available/py.idivles.ru` -> проксирует на `:3000`.
   - Создан отдельный виртуальный хост `/etc/nginx/sites-available/ty.idivles.ru` -> проксирует на `:3001`.
   - Созданы симлинки в `/etc/nginx/sites-enabled/`, синтаксис проверен (`nginx -t`), Nginx перезагружен без даунтайма.
6. **Верификация**:
   - Оба контура отвечают кодом 200 на `/api/health` и `/login`.
   - HTTP-запросы редиректятся на HTTPS с соответствующим доменом.
