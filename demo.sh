#!/usr/bin/env bash
# demo.sh: run the whole demo path with curl.
#   brand -> product -> @agent:concept -> (Claude designs, arcade.ai generates) -> proposal -> merge -> release -> open store
# Requires the server running (pnpm start) and jq.
set -euo pipefail
B="${BASE_URL:-http://localhost:3456}"
J='content-type: application/json'
step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

step "1. Create Brand Mist (alice)"
BRAND=$(curl -sf -X POST "$B/brands" -H "$J" -H 'x-user-id: u_alice' -d '{
  "name":"Mist","slug":"mist-'"$(date +%s)"'",
  "identity":{"mission":"Bring the stillness of East Asian landscapes into everyday life","voice":"Understated, quiet, with a touch of poetry","palette":["#7A8B7F","#E9E4D8","#B9A58C"]}}')
BID=$(jq -r .id <<<"$BRAND"); echo "brand $BID"

step "2. Create Product Tea Garden Pillow with an initial ProductSpec (alice)"
PROD=$(curl -sf -X POST "$B/brands/$BID/products" -H "$J" -H 'x-user-id: u_alice' -d '{
  "name":"Tea Garden Pillow",
  "spec":{"name":"Tea Garden Pillow","tagline":"Bring the mountain morning home",
    "concept":"A throw pillow themed on the morning mist over Taiwanese high-mountain tea gardens, for living rooms and bedrooms.","category":"home-textile",
    "target_audience":"Urban professionals aged 30 to 45 who love East Asian aesthetics",
    "features":[{"id":"f1","text":"Double-sided print"},{"id":"f2","text":"Hidden zipper"}],
    "materials":[{"id":"m1","name":"Cotton"}],
    "colorways":[{"id":"c1","name":"Sage Gray","hex":"#7A8B7F"}],
    "price_target":{"currency":"USD","min":null,"max":null},"images":[],"sourcing_notes":""}}')
PID=$(jq -r .id <<<"$PROD"); echo "product $PID, main head $(jq -r .main_head.id <<<"$PROD")"

step "3. Mention @agent:concept in the thread (alice)"
MSG=$(curl -sf -X POST "$B/products/$PID/messages" -H "$J" -H 'x-user-id: u_alice' \
  -d '{"body":"@agent:concept make a spring edition: add plum blossoms, use 20x20 linen"}')
RUN=$(jq -r .agent_run_id <<<"$MSG"); echo "agent_run $RUN"

step "4. Poll /agent-runs/:id every 2 seconds"
for i in $(seq 1 150); do
  R=$(curl -sf "$B/agent-runs/$RUN")
  ST=$(jq -r .status <<<"$R"); SG=$(jq -r .stage <<<"$R")
  printf '\r  %3ds  status=%-9s stage=%-10s tool_calls=%s   ' $((i*2)) "$ST" "$SG" "$(jq '.tool_calls|length' <<<"$R")"
  [ "$ST" != running ] && break
  sleep 2
done; echo
if [ "$ST" != succeeded ]; then echo "agent failed: $(jq -r .error <<<"$R")"; exit 1; fi
PROP=$(jq -r .output_proposal_id <<<"$R"); echo "proposal $PROP"
echo "--- agent messages:"; curl -sf "$B/products/$PID/messages" | jq -r '.[] | select(.author_type=="agent") | "  [agent] " + .body'

step "5. View the Proposal diff"
curl -sf "$B/proposals/$PROP" | jq '{summary, diff: [.diff[] | {path, kind}], images: .source.content.images, price: .source.content.arcade.unitPrice, maker: .source.content.arcade.maker.name}'

step "6. Merge (bob)"
curl -sf -X POST "$B/proposals/$PROP/merge" -H 'x-user-id: u_bob' | jq '{status: .proposal.status, merged_revision: .merged_revision.id, coauthors: [.coauthors[] | "\(.handle) x\(.revisions)\(if .on_behalf_of then " (on behalf of \(.on_behalf_of))" else "" end)"]}'

step "7. Release"
REL=$(curl -sf -X POST "$B/products/$PID/releases" -H 'x-user-id: u_alice')
RID=$(jq -r .id <<<"$REL"); jq '{id, version, title: .export_payload.title, images: (.export_payload.images|length), credits: .export_payload.credits}' <<<"$REL"

step "8. Open store (arcade.ai checkout)"
curl -sf -X POST "$B/releases/$RID/open-store" -H 'x-user-id: u_alice' | jq '{checkout_url, product}'

step "done"
echo "product page: $B/products/$PID"
