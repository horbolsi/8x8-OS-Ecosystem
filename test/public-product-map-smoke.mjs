import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const map = JSON.parse(await readFile(new URL('../public/product-map.json', import.meta.url), 'utf8'));

assert.equal(map.schemaVersion, '1.0.0');
assert.equal(map.releaseUnit, 'public-product-map-demo-v1');
assert.equal(map.owner.eightByEightId, '0000000001');
assert.equal(map.mode, 'PROTECTED_BETA');

const expectedRoutes = ['/art-board/', '/world/', '/scan/', '/marketplace/', '/missions/', '/plugins/'];
assert.deepEqual(map.routes.map((route) => route.path), expectedRoutes);
assert.equal(new Set(map.routes.map((route) => route.path)).size, expectedRoutes.length);

for (const route of map.routes) {
  assert.ok(route.label.length > 0);
  assert.ok(route.purpose.length > 0);
  assert.ok(route.interaction.includes('keyboard'));
  assert.ok(route.interaction.includes('touch'));
  assert.equal(typeof route.truth, 'object');
}

assert.equal(map.routes.find((route) => route.path === '/world/').truth.liveUsers, 0);
assert.equal(map.routes.find((route) => route.path === '/world/').truth.coordinatesUploaded, false);
assert.equal(map.routes.find((route) => route.path === '/scan/').truth.liveChainQueries, 0);
assert.equal(map.routes.find((route) => route.path === '/marketplace/').truth.payments, false);
assert.equal(map.routes.find((route) => route.path === '/missions/').truth.remoteExecution, false);
assert.equal(map.routes.find((route) => route.path === '/plugins/').truth.pluginExecutions, 0);

assert.deepEqual(map.accessibility.required, [
  'keyboard',
  'touch',
  'screen-reader',
  'reduced-motion',
  'forced-colors',
  'phone',
  'tablet',
  'desktop'
]);
assert.equal(map.accessibility.minimumTouchTargetCssPixels, 44);

assert.equal(map.privacy.fixtures, 'synthetic-or-consented-only');
assert.equal(map.privacy.precisePublicLocation, false);
assert.equal(map.privacy.browserPersistence, false);
assert.equal(map.privacy.liveChatOrCalls, false);
assert.equal(map.privacy.bluetoothOrWifiMesh, false);

assert.equal(map.releaseBoundary.targetBranch, 'beta/8x8-dual-monitor-v0.1');
assert.equal(map.releaseBoundary.productionAliasChange, false);
assert.equal(map.releaseBoundary.privateControlPlaneMerge, false);
assert.match(map.releaseBoundary.rollback, /Revert|restore/);

const serialized = JSON.stringify(map);
for (const forbidden of [
  /BEGIN PRIVATE KEY/i,
  /localhost/i,
  /127\.0\.0\.1/,
  /walletconnect/i,
  /ethereum\.request/i,
  /navigator\.bluetooth/i,
  /getUserMedia/i,
  /WebSocket/i,
  /EventSource/i
]) {
  assert.equal(forbidden.test(serialized), false, `forbidden pattern present: ${forbidden}`);
}

console.log('PUBLIC_PRODUCT_MAP_CHECKS=35_PASS');
