import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const benchmark = JSON.parse(await readFile(new URL('../public/world/spatial-client-benchmark.json', import.meta.url), 'utf8'));
const doc = await readFile(new URL('../docs/releases/MSG226_SPATIAL_CLIENT_BENCHMARK_V1.md', import.meta.url), 'utf8');

assert.equal(benchmark.release_unit, 'spatial-client-benchmark-v1');
assert.equal(benchmark.owner_8x8_id, '0000000001');
assert.equal(benchmark.mode, 'PROTECTED_BETA_RESEARCH_FIXTURE');
assert.equal(benchmark.whole_system_score_inferred, false);

const weightTotal = Object.values(benchmark.weights).reduce((sum, value) => sum + value, 0);
assert.equal(weightTotal, 100, 'weights total 100');
assert.equal(benchmark.candidates.length, 7, 'seven researched clients');

for (const candidate of benchmark.candidates) {
  const computed = Object.entries(benchmark.weights).reduce(
    (sum, [key, weight]) => sum + candidate.scores[key] * weight / 100,
    0
  );
  assert.ok(Math.abs(computed - candidate.weighted_score) < 0.001, `${candidate.name} weighted score`);
  assert.ok(candidate.weighted_score >= 0 && candidate.weighted_score <= 10, `${candidate.name} score range`);
}

const byName = Object.fromEntries(benchmark.candidates.map((candidate) => [candidate.name, candidate]));
assert.equal(byName['Babylon.js'].status, 'RECOMMENDED_BROWSER_ENGINE');
assert.equal(byName['MapLibre GL JS'].status, 'RECOMMENDED_MAP_ENGINE');
assert.equal(byName['CesiumJS'].status, 'CONDITIONAL_GLOBAL_CLIENT');
assert.equal(byName.WebXR.status, 'EXPERIMENTAL_PERMISSION_GATED');
assert.equal(byName.OpenUSD.status, 'AUTHORING_INTERCHANGE_ONLY');
assert.equal(byName.Roblox.status, 'EXTERNAL_CLIENT_ADAPTER_REQUIRED');
assert.equal(byName['Unreal Engine'].status, 'HIGH_FIDELITY_EXTERNAL_CLIENT');

assert.equal(benchmark.public_boundaries.runtime_imports_added, 0);
assert.equal(benchmark.public_boundaries.device_permissions_added, 0);
assert.equal(benchmark.public_boundaries.network_endpoints_added, 0);
assert.equal(benchmark.public_boundaries.precise_locations_added, 0);
assert.equal(benchmark.public_boundaries.live_users_added, 0);
assert.equal(benchmark.public_boundaries.wallet_or_payment_actions_added, 0);
assert.equal(benchmark.public_boundaries.private_core_connected, false);

for (const source of ['doc.babylonjs.com', 'maplibre.org', 'cesium.com', 'w3.org/TR/webxr', 'openusd.org', 'create.roblox.com', 'dev.epicgames.com']) {
  assert.ok(doc.includes(source), `official source ${source}`);
}

for (const boundary of ['PRODUCTION_ALIAS_CHANGED=NO', 'FINANCIAL_ACTIONS_ADDED=0', 'PRIVATE_CORE_CONNECTED=NO']) {
  assert.ok(doc.includes(boundary), boundary);
}

console.log(JSON.stringify({
  status: 'PASS',
  release_unit: benchmark.release_unit,
  checks: 31,
  candidates: benchmark.candidates.length,
  browser_engine: benchmark.decision.browser_default,
  runtime_imports_added: benchmark.public_boundaries.runtime_imports_added,
  device_permissions_added: benchmark.public_boundaries.device_permissions_added,
  private_core_connected: benchmark.public_boundaries.private_core_connected
}));
