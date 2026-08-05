import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile(new URL('../public/estate-registry.json', import.meta.url), 'utf8'));

assert.equal(registry.schemaVersion, '1.0.0');
assert.equal(registry.branch, 'integration/public-8x8-v1');
assert.equal(registry.truthBoundary, 'PUBLIC_SAFE_REGISTRY_NOT_PRIVATE_RUNTIME_TELEMETRY');
assert.ok(Array.isArray(registry.productLanes) && registry.productLanes.length === 2);
assert.ok(Array.isArray(registry.publicSurfaces) && registry.publicSurfaces.length >= 9);
assert.ok(Array.isArray(registry.domains) && registry.domains.length >= 10);
assert.ok(Array.isArray(registry.promotionContract) && registry.promotionContract.length === 10);

const ids = registry.publicSurfaces.map((surface) => surface.id);
assert.equal(new Set(ids).size, ids.length, 'public surface IDs must be unique');

const paths = registry.publicSurfaces.map((surface) => surface.path);
assert.equal(new Set(paths).size, paths.length, 'public surface paths must be unique');
assert.ok(paths.includes('/future-lab/'));

const privateLane = registry.productLanes.find((lane) => lane.id === 'private-core');
assert.equal(privateLane.publicMount, false);

for (const surface of registry.publicSurfaces) {
  assert.match(surface.path, /^\//);
  assert.ok(surface.status);
  assert.ok(surface.truth);
}

console.log(`estate registry valid: ${registry.publicSurfaces.length} surfaces, ${registry.domains.length} domains`);
