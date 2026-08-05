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

assert.equal(state.schema_version, '8x8.public-capabilities-observatory.v1');
assert.equal(state.candidates.length, 13);
assert.equal(new Set(state.candidates.map((item) => item.id)).size, 13);
assert.equal(new Set(state.candidates.map((item) => item.repository)).size, 13);
assert.equal(new Set(state.candidates.map((item) => item.pin)).size, 13);
assert.ok(state.candidates.every((item) => /^[0-9a-f]{40}$/.test(item.pin)));
assert.equal(state.summary.candidate_packets_merged, 13);
assert.equal(state.summary.third_party_candidates_installed_into_8x8, 0);
assert.equal(state.summary.external_measured_benchmarks_complete, 1);
assert.equal(state.summary.external_measured_benchmarks_required, 2);
assert.equal(state.summary.real_council_votes, 0);
assert.equal(state.summary.quorum_required, 4);
assert.equal(state.summary.council_quorum, false);
assert.ok(Object.values(state.absolute_boundaries).every((value) => value === false));
assert.equal(state.source.repository, '8x8org/8x8-user-edition');
assert.equal(state.source.commit, '52fbb2f4a4c19e1384e6c8a000f260ac54495750');
assert.equal(state.source.blob_sha, '5b65b82dac605d83790edd0071ff5931a4b29f88');
assert.equal(state.source.upstream_pin_set_sha256, '5a10b4f8de51fa9c50cbfbc9f10553a033c30fd687c215124222c2568f5dec41');

const supervision = state.candidates.find((item) => item.repository === 'roboflow/supervision');
assert.equal(supervision.status, 'READY_FOR_ADAPTER_DESIGN');
assert.equal(supervision.evidence.known_vulnerabilities, 0);
assert.equal(supervision.evidence.cleanup, 'PASS');
const pdf = state.candidates.find((item) => item.repository === 'firecrawl/pdf-inspector');
assert.equal(pdf.status, 'BLOCKED');
assert.deepEqual(pdf.evidence.advisories, ['RUSTSEC-2026-0176', 'RUSTSEC-2026-0177', 'RUSTSEC-2026-0192']);
const airllm = state.candidates.find((item) => item.repository === 'lyogavin/airllm');
assert.equal(airllm.status, 'BLOCKED');

assert.equal(release.route, '/capabilities/');
assert.equal(release.score.earned, 0);
assert.equal(release.score.whole_system_score, 'NOT_INFERRED');
assert.equal(release.boundaries.read_only, true);
for (const [key, value] of Object.entries(release.boundaries)) {
  if (key !== 'read_only') assert.equal(value, false, key);
}
assert.equal(release.rollback.baseline_commit, '767f6a0d49f390dab71ec403be381699603bbcce');

assert.match(html, /id="main"/);
assert.match(html, /class="skip-link"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /src="\.\/app\.js"/);
assert.match(html, /href="\.\/styles\.css"/);
assert.match(html, /name="8x8-release-id" content="MSG231-CAPABILITIES-OBSERVATORY-PREVIEW-V1"/);
assert.match(html, /name="8x8-source-commit" content="52fbb2f4a4c19e1384e6c8a000f260ac54495750"/);
assert.match(html, /name="8x8-source-blob" content="5b65b82dac605d83790edd0071ff5931a4b29f88"/);
assert.match(html, /name="8x8-pin-set-sha256" content="5a10b4f8de51fa9c50cbfbc9f10553a033c30fd687c215124222c2568f5dec41"/);
assert.match(html, /name="8x8-candidate-packets" content="13\/13"/);
assert.match(html, /name="8x8-external-benchmarks" content="1\/2"/);
assert.match(html, /name="8x8-runtime-installations" content="0"/);
assert.match(html, /name="8x8-real-council-votes" content="0\/4"/);
assert.match(html, /name="8x8-whole-system-completion" content="NOT_INFERRED"/);
assert.doesNotMatch(html, /https?:\/\//i);
assert.doesNotMatch(html, /<script[\s>](?![^>]*src=)/i);
assert.doesNotMatch(js, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function/);
assert.match(js, /textContent/);
assert.match(js, /credentials: 'same-origin'/);
assert.match(js, /FAIL_CLOSED_STATE_UNAVAILABLE/);
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

console.log('MSG231_CAPABILITIES_OBSERVATORY_SMOKE_PASS checks=57 installed=0 votes=0');
