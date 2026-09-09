# Логи агента на сервере

Всё рабочее складывается на VPS:

`/opt/cursor-agent/`

- `logs/journal.log` и `logs/YYYY-MM-DD.md`
- `scripts/` (`agent-log.sh`, `check-isolation.sh`)
- `notes/` (фичи стейджа, как писать лог)

Новая запись:

```bash
ssh -i agent_key agent@77.110.125.241 'bash /opt/cursor-agent/scripts/agent-log.sh "что сделано"'
```
