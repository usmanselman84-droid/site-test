#!/bin/bash
set -euo pipefail
TOK=$(sudo docker exec sochi-portal-db-1 psql -U sochi -d sochi_staging -At -c "select \"maxBotToken\" from \"SiteSettings\" where id='1'")
SEC=$(sudo docker exec sochi-portal-db-1 psql -U sochi -d sochi_staging -At -c "select \"maxWebhookSecret\" from \"SiteSettings\" where id='1'")
echo "lens ${#TOK} ${#SEC}"
sudo docker exec -e NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_ca.pem -e T="$TOK" sochi-staging-web-1 \
  node -e 'fetch("https://platform-api2.max.ru/me",{headers:{Authorization:process.env.T}}).then(r=>r.text().then(t=>console.log("me",r.status,t.slice(0,220)))).catch(e=>console.log("ERR",String(e)))'
sudo docker exec -e NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_ca.pem -e T="$TOK" -e S="$SEC" sochi-staging-web-1 \
  node -e 'const url="https://ty.idivles.ru/api/integrations/max/webhook"; const body=JSON.stringify({url,secret:process.env.S,update_types:["message_created","message_callback","bot_started"]}); fetch("https://platform-api2.max.ru/subscriptions",{method:"POST",headers:{Authorization:process.env.T,"Content-Type":"application/json"},body}).then(r=>r.text().then(t=>console.log("sub",r.status,t.slice(0,500)))).catch(e=>console.log("ERR",String(e)))'
