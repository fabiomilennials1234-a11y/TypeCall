#!/usr/bin/env bash
set -euo pipefail

API="${API_URL:-http://localhost:8080}"
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

echo "=== TypeCall Seed Data ==="
echo "API: $API"
echo ""

# ─── Register org + user ─────────────────────────────
echo "Creating org + user..."
curl -s -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"org_name":"milennials","org_slug":"milennials","email":"admin@milennials.com","password":"milennials2026","name":"Fábio"}' \
  "$API/api/v1/auth/register" > /dev/null 2>&1 || true

# Login (in case register returned 409)
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@milennials.com","password":"milennials2026"}' \
  "$API/api/v1/auth/login" > /dev/null

CSRF=$(grep csrf_token "$COOKIE_JAR" | awk '{print $NF}')
echo "  ✓ Authenticated (csrf=$CSRF)"

# ─── Form 1: Qualificação de Leads ──────────────────
echo "Creating forms..."
RESP=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Qualificação de Leads","description":"Formulário de qualificação para novos leads do Torque CRM"}' \
  "$API/api/v1/forms")
F1_ID=$(echo "$RESP" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  ✓ Form 1: $F1_ID"

DRAFT1='{"nodes":[{"id":"w1","type":"welcome","position":{"x":0,"y":0},"data":{"props":{"label":"Vamos conversar?","description":"Responda algumas perguntas rápidas para entendermos como ajudar."}}},{"id":"q1","type":"short_text","position":{"x":0,"y":1},"data":{"props":{"label":"Qual seu nome?","required":true}}},{"id":"q2","type":"email","position":{"x":0,"y":2},"data":{"props":{"label":"Seu melhor email?","required":true}}},{"id":"q3","type":"short_text","position":{"x":0,"y":3},"data":{"props":{"label":"Nome da empresa","required":true}}},{"id":"q4","type":"short_text","position":{"x":0,"y":4},"data":{"props":{"label":"Quantos funcionários?","required":false}}},{"id":"q5","type":"long_text","position":{"x":0,"y":5},"data":{"props":{"label":"O que você busca resolver?","required":false}}},{"id":"e1","type":"ending","position":{"x":0,"y":6},"data":{"props":{"label":"Obrigado!","description":"Entraremos em contato em até 24h."}}}],"edges":[{"id":"e-w1-q1","source":"w1","target":"q1"},{"id":"e-q1-q2","source":"q1","target":"q2"},{"id":"e-q2-q3","source":"q2","target":"q3"},{"id":"e-q3-q4","source":"q3","target":"q4"},{"id":"e-q4-q5","source":"q4","target":"q5"},{"id":"e-q5-e1","source":"q5","target":"e1"}]}'

curl -s -b "$COOKIE_JAR" -X PATCH \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"definition\":$DRAFT1}" \
  "$API/api/v1/forms/$F1_ID/draft" > /dev/null

curl -s -b "$COOKIE_JAR" -X POST \
  -H "X-CSRF-Token: $CSRF" \
  "$API/api/v1/forms/$F1_ID/publish" > /dev/null
echo "  ✓ Form 1 published"

# ─── Form 2: Pesquisa de Satisfação ─────────────────
RESP=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Pesquisa de Satisfação","description":"NPS e feedback dos clientes"}' \
  "$API/api/v1/forms")
F2_ID=$(echo "$RESP" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  ✓ Form 2: $F2_ID"

DRAFT2='{"nodes":[{"id":"w2","type":"welcome","position":{"x":0,"y":0},"data":{"props":{"label":"Queremos ouvir você","description":"Leva menos de 2 minutos."}}},{"id":"nps","type":"short_text","position":{"x":0,"y":1},"data":{"props":{"label":"De 0 a 10, quanto recomendaria nosso produto?","required":true}}},{"id":"fb","type":"long_text","position":{"x":0,"y":2},"data":{"props":{"label":"O que podemos melhorar?","required":false}}},{"id":"e2","type":"ending","position":{"x":0,"y":3},"data":{"props":{"label":"Valeu!","description":"Seu feedback é fundamental para evoluirmos."}}}],"edges":[{"id":"e-w2-nps","source":"w2","target":"nps"},{"id":"e-nps-fb","source":"nps","target":"fb"},{"id":"e-fb-e2","source":"fb","target":"e2"}]}'

curl -s -b "$COOKIE_JAR" -X PATCH \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"definition\":$DRAFT2}" \
  "$API/api/v1/forms/$F2_ID/draft" > /dev/null

curl -s -b "$COOKIE_JAR" -X POST \
  -H "X-CSRF-Token: $CSRF" \
  "$API/api/v1/forms/$F2_ID/publish" > /dev/null
echo "  ✓ Form 2 published"

# ─── Form 3: Draft (not published) ──────────────────
curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Onboarding Clientes (rascunho)","description":"Em construção"}' \
  "$API/api/v1/forms" > /dev/null
echo "  ✓ Form 3 (draft)"

# ─── Event Types ─────────────────────────────────────
echo "Creating event types..."
RESP=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Demo de Produto","slug":"demo","duration_minutes":30,"location_type":"google_meet","color":"#6366f1","min_notice_hours":2,"max_advance_days":30,"buffer_after_minutes":10}' \
  "$API/api/v1/event-types")
ET1_ID=$(echo "$RESP" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  ✓ Event Type 1 (Demo 30min): $ET1_ID"

RESP=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Consultoria Estratégica","slug":"consultoria","duration_minutes":60,"location_type":"google_meet","color":"#f59e0b","min_notice_hours":24,"max_advance_days":14,"buffer_before_minutes":5,"buffer_after_minutes":15}' \
  "$API/api/v1/event-types")
ET2_ID=$(echo "$RESP" | sed 's/.*"id":"\([^"]*\)".*/\1/')
echo "  ✓ Event Type 2 (Consultoria 60min): $ET2_ID"

# ─── Availability Rules (Mon-Fri 9-17) ──────────────
echo "Setting availability..."
for ET_ID in "$ET1_ID" "$ET2_ID"; do
  curl -s -b "$COOKIE_JAR" -X PUT \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF" \
    -d '{"rules":[{"day_of_week":1,"start_time":"09:00","end_time":"12:00"},{"day_of_week":1,"start_time":"14:00","end_time":"18:00"},{"day_of_week":2,"start_time":"09:00","end_time":"12:00"},{"day_of_week":2,"start_time":"14:00","end_time":"18:00"},{"day_of_week":3,"start_time":"09:00","end_time":"12:00"},{"day_of_week":3,"start_time":"14:00","end_time":"18:00"},{"day_of_week":4,"start_time":"09:00","end_time":"12:00"},{"day_of_week":4,"start_time":"14:00","end_time":"18:00"},{"day_of_week":5,"start_time":"09:00","end_time":"17:00"}]}' \
    "$API/api/v1/event-types/$ET_ID/availability" > /dev/null
done
echo "  ✓ Availability set (Mon-Fri, split schedule)"

# ─── Fake Responses for Form 1 ──────────────────────
echo "Submitting sample responses..."
F1_SLUG=$(curl -s "$API/api/v1/public/forms/qualificacao-de-leads" | sed 's/.*"slug":"\([^"]*\)".*/\1/')
if [ -z "$F1_SLUG" ]; then
  F1_SLUG="qualificacao-de-leads"
fi

NAMES=("João Silva" "Maria Santos" "Pedro Oliveira" "Ana Costa" "Lucas Ferreira")
EMAILS=("joao@acme.com" "maria@startup.io" "pedro@bigcorp.com" "ana@tech.dev" "lucas@agency.co")
COMPANIES=("Acme Corp" "StartupXYZ" "BigCorp" "TechDev" "Digital Agency")

for i in 0 1 2 3 4; do
  curl -s \
    -H "Content-Type: application/json" \
    -d "{\"answers\":[{\"node_id\":\"q1\",\"value\":\"${NAMES[$i]}\"},{\"node_id\":\"q2\",\"value\":\"${EMAILS[$i]}\"},{\"node_id\":\"q3\",\"value\":\"${COMPANIES[$i]}\"},{\"node_id\":\"q4\",\"value\":\"$((RANDOM % 200 + 5))\"},{\"node_id\":\"q5\",\"value\":\"Precisamos de um CRM melhor.\"}],\"respondent_email\":\"${EMAILS[$i]}\",\"respondent_name\":\"${NAMES[$i]}\"}" \
    "$API/api/v1/public/forms/$F1_SLUG/responses" > /dev/null
done
echo "  ✓ 5 responses submitted"

# ─── Analytics Events ────────────────────────────────
echo "Ingesting analytics events..."
for _ in $(seq 1 5); do
  UUID1=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())')
  UUID2=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())')
  UUID3=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())')
  curl -s \
    -H "Content-Type: application/json" \
    -d "{\"events\":[{\"event_id\":\"$UUID1\",\"form_id\":\"$F1_ID\",\"event_type\":\"view\"},{\"event_id\":\"$UUID2\",\"form_id\":\"$F1_ID\",\"event_type\":\"start\"},{\"event_id\":\"$UUID3\",\"form_id\":\"$F1_ID\",\"event_type\":\"submit\"}]}" \
    "$API/api/v1/public/events" > /dev/null
done
echo "  ✓ Analytics events ingested"

# ─── Refresh materialized view ───────────────────────
curl -s -b "$COOKIE_JAR" -X POST \
  -H "X-CSRF-Token: $CSRF" \
  "$API/api/v1/analytics/refresh" > /dev/null
echo "  ✓ Analytics view refreshed"

echo ""
echo "=== Seed Complete ==="
echo ""
echo "Login: admin@milennials.com / milennials2026"
echo "Forms: http://localhost:5173/forms"
echo "Runner: http://localhost:5173/f/qualificacao-de-leads"
echo "Runner: http://localhost:5173/f/pesquisa-de-satisfacao"
echo "Scheduling: http://localhost:5173/scheduling"
echo "Analytics: http://localhost:5173/analytics"
