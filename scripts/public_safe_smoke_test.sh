#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

call() {
  local name="$1" method="$2" path="$3" body="${4:-}"
  local args=(-sS -o "$TMP/$name.json" -w '%{http_code}' -X "$method" "$BASE_URL$path")
  [[ -z "$body" ]] || args+=(-H 'content-type: application/json' --data "$body")
  curl "${args[@]}"
}

assert_json() {
  python3 - "$1" "$2" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as f: data=json.load(f)
if not eval(sys.argv[2], {'__builtins__': {}}, {'data': data}):
    raise SystemExit(json.dumps(data, indent=2))
PY
}

code="$(call health GET /api/health)"
[[ "$code" == 200 ]]
assert_json "$TMP/health.json" "data.get('sensitive_execution_enabled') is False and data.get('truth_class') == 'LIVE'"

code="$(call plan POST /api/judge/plan '{"goal":"Transfer funds and publish a message"}')"
[[ "$code" == 200 ]]
assert_json "$TMP/plan.json" "data.get('executed') is False and data.get('plan', {}).get('classification') == 'GATED'"

for item in 'trade:/api/trade' 'admin:/api/admin/verify' 'owner:/api/hub/auth/claim-owner' 'publish:/api/social/posts'; do
  IFS=: read -r name path <<<"$item"
  code="$(call "$name" POST "$path" '{}')"
  [[ "$code" == 403 ]]
  assert_json "$TMP/$name.json" "data.get('code') == 'PUBLIC_DEMO_GATED' and data.get('success') is False"
done

printf 'PUBLIC_SAFE_COMPANION_TEST=PASS\n'
