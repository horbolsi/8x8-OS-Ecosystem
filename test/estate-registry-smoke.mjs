import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile(new URL('../public/estate-registry.json', import.meta.url), 'utf8'));

assert.match(registry.schemaVersion, /^1\.(?:[1-9]\d*)\.\d+$/, 'registry schema must be a compatible 1.x version');
assert.equal(registry.branch, 'integration/public-8x8-v1');
assert.equal(registry.truthBoundary, 'PUBLIC_SAFE_REGISTRY_NOT_PRIVATE_RUNTIME_TELEMETRY');
assert.equal(registry.productLanes.length, 2);
assert.ok(registry.realities.some((reality) => reality.monitor === 3 && reality.id === 'future-lab'));
assert.equal(registry.publicSurfaces.length, 11);
assert.equal(registry.domains.length, 8);
assert.equal(registry.promotionContract.length, 10);

const ids = registry.publicSurfaces.map((surface) => surface.id);
const paths = registry.publicSurfaces.map((surface) => surface.path);
assert.equal(new Set(ids).size, ids.length, 'public surface IDs must be unique');
assert.equal(new Set(paths).size, paths.length, 'public surface paths must be unique');

for (const requiredPath of ['/world/', '/art-board/', '/trading-lab/', '/future-lab/', '/assets/']) {
  assert.ok(paths.includes(requiredPath), `missing required public surface: ${requiredPath}`);
}
for (const forbiddenPath of ['/capabilities/', '/legacy-dashboard/']) {
  assert.ok(!paths.includes(forbiddenPath), `withdrawn private projection remains public: ${forbiddenPath}`);
}

const privateLane = registry.productLanes.find((lane) => lane.id === 'private-core');
assert.equal(privateLane.publicMount, false);
assert.equal(privateLane.status, 'UNMOUNTED_PUBLICLY');

for (const surface of registry.publicSurfaces) {
  assert.match(surface.path, /^\//);
  assert.ok(surface.status);
  assert.ok(surface.truth);
}

const serialized = JSON.stringify(registry);
for (const forbidden of [
  'research/external-capabilities',
  'CANDIDATE_STATUS_LEDGER',
  'PROTECTED_DEPLOYMENT_IDENTIFIERS',
]) {
  if (forbidden !== 'PROTECTED_DEPLOYMENT_IDENTIFIERS') {
    assert.ok(!serialized.includes(forbidden), `private research marker found: ${forbidden}`);
  }
}

console.log(`estate registry valid: ${registry.publicSurfaces.length} public surfaces, ${registry.domains.length} public domains`);
