# Рабочий контур: только ty

Агент работает **только** с тестовым сайтом **ty.idivles.ru** (`/opt/sochi-portal-staging`).

- **py.idivles.ru / prod не трогать** (код, Docker rebuild, DB, nginx prod), пока пользователь явно не напишет **«одобряю»**.

- После «одобряю» — дублировать проверенное с **ty → py**, не наоборот.

- Аудиты и фиксы по умолчанию: `ty` only.

VPS marker: `/opt/cursor-agent/WORK_SCOPE.txt`
