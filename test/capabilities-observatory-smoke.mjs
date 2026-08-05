import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cap = path.join(root, 'public', 'capabilities');
const read = (name) => fs.readFileSync(path.join(cap, name), 'utf8');
const html = read('index.html');
const css = read('styles.css');
const js = read('app.js');
const state = JSON.parse(read('state.json'));
const release = JSON.parse(read('release-unit.json'));

for (const name of ['index.html', 'styles.css', 'app.js', 'state.json', 'release-unit.json', 'README.md']) {
  assert.equal(fs.existsSync(path.join(cap, name)), true, `missing ${name}`);
}

assert.equal(state.schema_version, '8x8.public-capabilities-observatory.v2');
assert.equal(state.release_id, 'MSG232-CAPABILITIES-OBSERVATORY-PREVIEW-V2');
assert.equal(state.candidates.length, 13);
assert.equal(new Set(state.candidates.map((item) => item.id)).size, 13);
assert.equal(new Set(state.candidates.map((item) => item.repository)).size, 13);
assert.equal(new Set(state.candidates.map((item) => item.pin)).size, 13);
assert.ok(state.candidates.every((item) => /^[0-9a-f]{40}$/.test(item.pin)));
assert.equal(state.summary.candidate_packets_merged, 13);
assert.equal(state.summary.third_party_candidates_installed_into_8x8, 0);
assert.equal(state.summary.external_measured_benchmarks_complete, 1);
assert.equal(state.summary.external_measured_benchmarks_required, 2);
assert.equal(state.summary.disabled_adapter_contracts_merged, 1);
assert.equal(state.summary.real_council_votes, 0);
assert.equal(state.summary.quorum_required, 4);
assert.equal(state.summary.council_quorum, false);
assert.ok(Object.values(state.absolute_boundaries).every((value) => value === false));
assert.equal(state.source.repository, '8x8org/8x8-user-edition');
assert.equal(state.source.commit, 'fd33e0786b9f2b0bf4794ba153cfe7c2e4ef0737');
assert.equal(state.source.path, 'research/external-capabilities/CANDIDATE_STATUS_LEDGER_V4.json');
assert.equal(state.source.blob_sha, '138ba5f26fd46651d29e7dd6903a15e94c0802f1');
assert.equal(state.source.upstream_pin_set_sha256, '5a10b4f8de51fa9c50cbfbc9f10553a033c30fd687c215124222c2568f5dec41');

const supervision = state.candidates.find((item) => item.repository === 'roboflow/supervision');
assert.equal(supervision.status, 'ADAPTER_CONTRACT_MERGED');
assert.equal(supervision.runtime, 'NOT_INSTALLED_DISABLED_ADAPTER_CONTRACT_MERGED');
assert.equal(supervision.evidence.known_vulnerabilities, 0);
assert.equal(supervision.evidence.cleanup, 'PASS');
assert.equal(supervision.evidence.adapter_contract.merge_commit, 'a7d3be2dabce36b6cc994bbaab0d27ed5de5ae99');
assert.equal(supervision.evidence.adapter_contract.enabled, false);
assert.equal(supervision.evidence.adapter_contract.install_state, 'NOT_INSTALLED');
assert.equal(supervision.evidence.adapter_contract.runtime_authority, 'NONE');
assert.equal(supervision.evidence.adapter_contract.production_ready, false);
const pdf = state.candidates.find((item) => item.repository === 'firecrawl/pdf-inspector');
assert.equal(pdf.status, 'BLOCKED');
assert.deepEqual(pdf.evidence.advisories, ['RUSTSEC-2026-0176', 'RUSTSEC-2026-0177', 'RUSTSEC-2026-0192']);
const airllm = state.candidates.find((item) => item.repository === 'lyogavin/airllm');
assert.equal(airllm.status, 'BLOCKED');

assert.equal(release.release_id, 'MSG232-CAPABILITIES-OBSERVATORY-PREVIEW-V2');
assert.equal(release.route, '/capabilities/');
assert.equal(release.score.earned, 90);
assert.equal(release.score.possible, 100);
assert.equal(release.score.whole_system_score, 'NOT_INFERRED');
assert.equal(Object.values(release.score.weights).reduce((total, value) => total + value, 0), 100);
assert.equal(release.canonical_source.commit, 'fd33e0786b9f2b0bf4794ba153cfe7c2e4ef0737');
assert.equal(release.canonical_source.blob_sha, '138ba5f26fd46651d29e7dd6903a15e94c0802f1');
assert.equal(release.deployment.content_commit, '35b35d8b72f0505609f9c81ba954f181a20e08e9');
assert.equal(release.deployment.deployment_id, 'dpl_5nsbHGwvxF3ZLaELZ5Ea9HCVv9iC');
assert.equal(release.deployment.state, 'READY');
assert.equal(release.deployment.github_workflow_run_id, 31053812855);
assert.equal(release.deployment.github_workflow_conclusion, 'SUCCESS');
assert.equal(release.deployment.production_alias_changed, false);
assert.equal(release.route_verification.observed_status, 302);
assert.equal(release.route_verification.observed_location_class, 'VERCEL_SSO_REDIRECT');
assert.equal(release.route_verification.http_200_verified, false);
assert.equal(release.route_verification.content_markers_verified_over_http, false);
assert.equal(release.promotion_gates.route_http_200, false);
assert.equal(release.truth_state, 'PROTECTED_PREVIEW_READY_ROUTE_VERIFICATION_BLOCKED_NO_MERGE');
assert.equal(release.boundaries.read_only, true);
for (const [key, value] of Object.entries(release.boundaries)) {
  if (key !== 'read_only') assert.equal(value, false, key);
}
assert.equal(release.rollback.baseline_commit, '6b7e5bf8fb13587a2e26f4949ae774a41571cc5f');

assert.match(html, /id="main"/);
assert.match(html, /class="skip-link"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /src="\.\/app\.js"/);
assert.match(html, /href="\.\/styles\.css"/);
assert.match(html, /id="adapters"/);
assert.match(html, /value="ADAPTER_CONTRACT_MERGED"/);
assert.match(html, /name="8x8-release-id" content="MSG232-CAPABILITIES-OBSERVATORY-PREVIEW-V2"/);
assert.match(html, /name="8x8-source-commit" content="fd33e0786b9f2b0bf4794ba153cfe7c2e4ef0737"/);
assert.match(html, /name="8x8-source-blob" content="138ba5f26fd46651d29e7dd6903a15e94c0802f1"/);
assert.match(html, /name="8x8-pin-set-sha256" content="5a10b4f8de51fa9c50cbfbc9f10553a033c30fd687c215124222c2568f5dec41"/);
assert.match(html, /name="8x8-candidate-packets" content="13\/13"/);
assert.match(html, /name="8x8-external-benchmarks" content="1\/2"/);
assert.match(html, /name="8x8-disabled-adapter-contracts" content="1"/);
assert.match(html, /name="8x8-runtime-installations" content="0"/);
assert.match(html, /name="8x8-real-council-votes" content="0\/4"/);
assert.match(html, /name="8x8-whole-system-completion" content="NOT_INFERRED"/);
assert.doesNotMatch(html, /https?:\/\//i);
assert.doesNotMatch(html, /<script[\s>](?![^>]*src=)/i);
assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
assert.match(js, /textContent/);
assert.match(js, /credentials: 'same-origin'/);
assert.match(js, /FAIL_CLOSED_STATE_UNAVAILABLE/);
assert.match(js, /ADAPTER_CONTRACT_MERGED/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /forced-colors/);

const corpus = [html, css, js, JSON.stringify(state), JSON.stringify(release)].join('\n');
for (const pattern of [
  /\/root\//i,
  /\/data\/data\/com\.termux/i,
  /BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY/i,
  /\bgh[opsu]_[A-Za-z0-9]{20,}\b/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
  /authorization:\s*bearer/i,
  /seed phrase/i,
  /wallet address/i,
  /127\.0\.0\.1/,
  /localhost:\d+/i,
]) assert.doesNotMatch(corpus, pattern);

console.log('MSG232_CAPABILITIES_OBSERVATORY_V2_SMOKE_PASS score=90 route=302 installed=0 adapters=1 votes=0');
