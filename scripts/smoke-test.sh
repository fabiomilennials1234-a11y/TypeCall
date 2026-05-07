#!/usr/bin/env bash
set -euo pipefail

API="${API_URL:-http://localhost:8080}"
COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

pass=0
fail=0

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $name"
    pass=$((pass + 1))
  else
    echo "  ✗ $name (expected=$expected got=$actual)"
    fail=$((fail + 1))
  fi
}

extract_json() {
  echo "$1" | sed "s/.*\"$2\":\s*\"\([^\"]*\)\".*/\1/"
}

echo "=== TypeCall Smoke Test ==="
echo "API: $API"
echo ""

# ─── Health ───────────────────────────────────────────
echo "── Health"
status=$(curl -s -o /dev/null -w "%{http_code}" "$API/healthz")
check "GET /healthz" "200" "$status"

status=$(curl -s -o /dev/null -w "%{http_code}" "$API/readyz")
check "GET /readyz" "200" "$status"

status=$(curl -s -o /dev/null -w "%{http_code}" "$API/metrics")
check "GET /metrics" "200" "$status"

# ─── Auth: Register ──────────────────────────────────
echo "── Auth"
BODY=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"org_name":"Smoke Test Org","org_slug":"smoke-test","email":"smoke@test.com","password":"smoketest123","name":"Smoke User"}' \
  "$API/api/v1/auth/register")
HTTP_CODE=$(echo "$BODY" | tail -1)
RESPONSE=$(echo "$BODY" | head -n -1)
# 201 = created, 409 = already exists (re-run)
if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
  check "POST /auth/register" "ok" "ok"
else
  check "POST /auth/register" "201|409" "$HTTP_CODE"
fi

# ─── Auth: Login ─────────────────────────────────────
BODY=$(curl -s -w "\n%{http_code}" -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"smoketest123"}' \
  "$API/api/v1/auth/login")
HTTP_CODE=$(echo "$BODY" | tail -1)
RESPONSE=$(echo "$BODY" | head -n -1)
check "POST /auth/login" "200" "$HTTP_CODE"

# Extract CSRF token from cookie jar
CSRF=$(grep csrf_token "$COOKIE_JAR" | awk '{print $NF}' || echo "")
if [ -z "$CSRF" ]; then
  echo "  ✗ CSRF token not found in cookies"
  fail=$((fail + 1))
else
  check "CSRF token present" "ok" "ok"
fi

# ─── Auth: Me ────────────────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/auth/me")
check "GET /auth/me" "200" "$status"

# ─── Forms: Create ───────────────────────────────────
echo "── Forms"
BODY=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Smoke Test Form","description":"Testing E2E"}' \
  "$API/api/v1/forms")
HTTP_CODE=$(echo "$BODY" | tail -1)
RESPONSE=$(echo "$BODY" | head -n -1)
check "POST /forms" "201" "$HTTP_CODE"

FORM_ID=$(extract_json "$RESPONSE" "id")
FORM_SLUG=$(extract_json "$RESPONSE" "slug")
echo "    form_id=$FORM_ID slug=$FORM_SLUG"

# ─── Forms: List ─────────────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/forms")
check "GET /forms" "200" "$status"

# ─── Forms: Get ──────────────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/forms/$FORM_ID")
check "GET /forms/{id}" "200" "$status"

# ─── Forms: Save Draft ───────────────────────────────
DRAFT='{"nodes":[{"id":"welcome-1","type":"welcome","position":{"x":0,"y":0},"data":{"props":{"label":"Bem-vindo","description":"Teste smoke"}}},{"id":"text-1","type":"short_text","position":{"x":0,"y":1},"data":{"props":{"label":"Seu nome?","required":true}}},{"id":"email-1","type":"email","position":{"x":0,"y":2},"data":{"props":{"label":"Seu email?","required":true}}},{"id":"ending-1","type":"ending","position":{"x":0,"y":3},"data":{"props":{"label":"Obrigado!","description":"Respostas enviadas."}}}],"edges":[{"id":"e1","source":"welcome-1","target":"text-1"},{"id":"e2","source":"text-1","target":"email-1"},{"id":"e3","source":"email-1","target":"ending-1"}]}'

status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X PATCH \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d "{\"definition\":$DRAFT}" \
  "$API/api/v1/forms/$FORM_ID/draft")
check "PATCH /forms/{id}/draft" "200" "$status"

# ─── Forms: Publish ──────────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST \
  -H "X-CSRF-Token: $CSRF" \
  "$API/api/v1/forms/$FORM_ID/publish")
check "POST /forms/{id}/publish" "201" "$status"

# ─── Public: Get Form by Slug ────────────────────────
echo "── Public Forms"
BODY=$(curl -s -w "\n%{http_code}" "$API/api/v1/public/forms/$FORM_SLUG")
HTTP_CODE=$(echo "$BODY" | tail -1)
check "GET /public/forms/{slug}" "200" "$HTTP_CODE"

# ─── Public: Submit Response ─────────────────────────
BODY=$(curl -s -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"node_id":"text-1","value":"Smoke Tester"},{"node_id":"email-1","value":"tester@smoke.com"}],"respondent_email":"tester@smoke.com","respondent_name":"Smoke Tester"}' \
  "$API/api/v1/public/forms/$FORM_SLUG/responses")
HTTP_CODE=$(echo "$BODY" | tail -1)
check "POST /public/forms/{slug}/responses" "201" "$HTTP_CODE"

# ─── Responses: List ─────────────────────────────────
echo "── Responses"
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/forms/$FORM_ID/responses")
check "GET /forms/{id}/responses" "200" "$status"

# ─── Event Types: Create ─────────────────────────────
echo "── Scheduling"
BODY=$(curl -s -w "\n%{http_code}" -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"title":"Demo Call","slug":"demo-call","duration_minutes":30,"location_type":"google_meet","color":"#6366f1","min_notice_hours":1,"max_advance_days":60}' \
  "$API/api/v1/event-types")
HTTP_CODE=$(echo "$BODY" | tail -1)
RESPONSE=$(echo "$BODY" | head -n -1)

if [ "$HTTP_CODE" = "201" ]; then
  check "POST /event-types" "201" "$HTTP_CODE"
  ET_ID=$(extract_json "$RESPONSE" "id")
else
  check "POST /event-types" "201" "$HTTP_CODE"
  ET_ID=""
fi

if [ -n "$ET_ID" ]; then
  echo "    event_type_id=$ET_ID"

  # ─── Event Types: List ───────────────────────────────
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/event-types")
  check "GET /event-types" "200" "$status"

  # ─── Availability: Set Rules ─────────────────────────
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
    -X PUT \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: $CSRF" \
    -d '{"rules":[{"day_of_week":1,"start_time":"09:00","end_time":"17:00"},{"day_of_week":2,"start_time":"09:00","end_time":"17:00"},{"day_of_week":3,"start_time":"09:00","end_time":"17:00"},{"day_of_week":4,"start_time":"09:00","end_time":"17:00"},{"day_of_week":5,"start_time":"09:00","end_time":"17:00"}]}' \
    "$API/api/v1/event-types/$ET_ID/availability")
  check "PUT /event-types/{id}/availability" "200" "$status"

  # ─── Availability: Get ─────────────────────────────
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
    "$API/api/v1/event-types/$ET_ID/availability")
  check "GET /event-types/{id}/availability" "200" "$status"

  # ─── Public: Get Slots ─────────────────────────────
  FROM=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d)
  TO=$(date -d "+7 days" +%Y-%m-%d 2>/dev/null || date -v+7d +%Y-%m-%d)
  BODY=$(curl -s -w "\n%{http_code}" \
    "$API/api/v1/public/event-types/$ET_ID/slots?from=$FROM&to=$TO&timezone=America/Sao_Paulo")
  HTTP_CODE=$(echo "$BODY" | tail -1)
  check "GET /public/event-types/{id}/slots" "200" "$HTTP_CODE"

  # ─── Bookings: List ────────────────────────────────
  status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/bookings")
  check "GET /bookings" "200" "$status"
fi

# ─── Analytics: Ingest Events ────────────────────────
echo "── Analytics"
BODY=$(curl -s -w "\n%{http_code}" \
  -H "Content-Type: application/json" \
  -d "{\"events\":[{\"event_id\":\"$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())')\",\"form_id\":\"$FORM_ID\",\"event_type\":\"view\"},{\"event_id\":\"$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python -c 'import uuid;print(uuid.uuid4())')\",\"form_id\":\"$FORM_ID\",\"event_type\":\"start\"}]}" \
  "$API/api/v1/public/events")
HTTP_CODE=$(echo "$BODY" | tail -1)
check "POST /public/events" "200" "$HTTP_CODE"

# ─── Analytics: Summary ──────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  "$API/api/v1/analytics/forms/$FORM_ID/summary")
check "GET /analytics/forms/{id}/summary" "200" "$status"

# ─── Webhooks: Get Config ────────────────────────────
echo "── Webhooks"
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$API/api/v1/webhooks/config")
check "GET /webhooks/config" "200" "$status"

# ─── Auth: Refresh ───────────────────────────────────
echo "── Token Refresh"
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$API/api/v1/auth/refresh")
check "POST /auth/refresh" "200" "$status"

# ─── Auth: Logout ────────────────────────────────────
status=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" \
  -X POST "$API/api/v1/auth/logout")
check "POST /auth/logout" "204" "$status"

# ─── Summary ─────────────────────────────────────────
echo ""
echo "=== Results: $pass passed, $fail failed ==="
if [ "$fail" -gt 0 ]; then
  exit 1
fi
