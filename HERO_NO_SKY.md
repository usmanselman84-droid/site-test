# Главная: без неба/солнца/луны (только ty)

**Контур:** `ty.idivles.ru` / `/opt/sochi-portal-staging`. **py не трогали.**

## Запрос

Убрать overlays солнца/луны/неба с героя главной и уплотнить вёрстку (меньше пустого неба, перенос лида, нахлёст колоды, теплее страница).

## Исходники TEST

- `HomeServiceHero.tsx`: нет `SochiLivingSky` и `.lift-hero__glow`.
- `header-boot.js` `v=14`: killSky снимает `.sochi-sky` из DOM.
- `globals.css`: короче stage, pretty-lead, отрицательный margin колоды.
- `theme.css?v=hdr26`: `.lift-hero .sochi-sky` и glow скрыты.
- nginx отдаёт `header-boot.js?v=14`.

## Rebuild (сделано)

Первый `up -d --build` упёрся в 2 ГБ RAM (OOM reboot). Добавили `/swapfile2` 2G, heap builder `1280`, staging web останавливали на время сборки.

```bash
cd /opt/sochi-portal-staging
sudo docker compose -p sochi-staging -f docker-compose.staging.yml up -d --build
```

Образ `sochi-staging_web` пересобран **2026-09-10**. Prod `sochi-portal-web` **не** пересобирали (образ от 2026-09-08).

## Проверка HTML

`curl` `https://ty.idivles.ru/` с `Cache-Control: no-cache`:

- HTTP 200, `cache-control: private, no-cache, no-store`
- `header-boot.js?v=14`, `theme.css?v=hdr26`
- в HTML **0** вхождений `sochi-sky`, `sochi-sky__sun`, `lift-hero__glow`
- герой: фото моря + veil + copy, без sun/moon overlay
