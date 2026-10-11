#!/usr/bin/env bash
# demo.sh: run the whole demo path with curl.
#   brand -> product -> @agent:concept -> (Claude designs, arcade.ai generates) -> proposal -> merge -> release -> open store
# Requires the server running (pnpm start) and jq.
set -euo pipefail
B="${BASE_URL:-http://localhost:3456}"
J='content-type: application/json'
step() { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

step "1. 建 Brand 山嵐 Mist（alice）"
BRAND=$(curl -sf -X POST "$B/brands" -H "$J" -H 'x-user-id: u_alice' -d '{
  "name":"山嵐 Mist","slug":"mist-'"$(date +%s)"'",
  "identity":{"mission":"把東方山水的靜謐帶進日常生活","voice":"淡雅、含蓄、帶一點詩意","palette":["#7A8B7F","#E9E4D8","#B9A58C"]}}')
BID=$(jq -r .id <<<"$BRAND"); echo "brand $BID"

step "2. 建 Product 茶園抱枕，附初始 ProductSpec（alice）"
PROD=$(curl -sf -X POST "$B/brands/$BID/products" -H "$J" -H 'x-user-id: u_alice' -d '{
  "name":"茶園抱枕",
  "spec":{"name":"茶園抱枕","tagline":"把山裡的清晨帶回家",
    "concept":"以台灣高山茶園的晨霧為題的抱枕，適合客廳與臥室。","category":"home-textile",
    "target_audience":"喜歡東方美學、30 到 45 歲的都市上班族",
    "features":[{"id":"f1","text":"雙面印花"},{"id":"f2","text":"隱形拉鍊"}],
    "materials":[{"id":"m1","name":"棉"}],
    "colorways":[{"id":"c1","name":"青灰","hex":"#7A8B7F"}],
    "price_target":{"currency":"USD","min":null,"max":null},"images":[],"sourcing_notes":""}}')
PID=$(jq -r .id <<<"$PROD"); echo "product $PID, main head $(jq -r .main_head.id <<<"$PROD")"

step "3. 在討論串 @agent:concept（alice）"
MSG=$(curl -sf -X POST "$B/products/$PID/messages" -H "$J" -H 'x-user-id: u_alice' \
  -d '{"body":"@agent:concept 做成春季限定版，加梅花，用 20x20 亞麻"}')
RUN=$(jq -r .agent_run_id <<<"$MSG"); echo "agent_run $RUN"

step "4. 每 2 秒輪詢 /agent-runs/:id"
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

step "5. 看 Proposal diff"
curl -sf "$B/proposals/$PROP" | jq '{summary, diff: [.diff[] | {path, kind}], images: .source.content.images, price: .source.content.arcade.unitPrice, maker: .source.content.arcade.maker.name}'

step "6. 按 merge（bob）"
curl -sf -X POST "$B/proposals/$PROP/merge" -H 'x-user-id: u_bob' | jq '{status: .proposal.status, merged_revision: .merged_revision.id, coauthors: [.coauthors[] | "\(.handle) x\(.revisions)\(if .on_behalf_of then " (on behalf of \(.on_behalf_of))" else "" end)"]}'

step "7. Release"
REL=$(curl -sf -X POST "$B/products/$PID/releases" -H 'x-user-id: u_alice')
RID=$(jq -r .id <<<"$REL"); jq '{id, version, title: .export_payload.title, images: (.export_payload.images|length), credits: .export_payload.credits}' <<<"$REL"

step "8. 開店（arcade.ai checkout）"
curl -sf -X POST "$B/releases/$RID/open-store" -H 'x-user-id: u_alice' | jq '{checkout_url, product}'

step "done"
echo "product page: $B/products/$PID"
