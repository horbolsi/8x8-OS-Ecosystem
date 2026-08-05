import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/plugins/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../public/plugins/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/plugins/styles.css', import.meta.url), 'utf8');
const state = JSON.parse(await readFile(new URL('../public/plugins/state.json', import.meta.url), 'utf8'));

assert.match(html, /8x8 Plugin Gate/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self'/);
assert.match(html, /LIVE PLUGINS/);
assert.match(html, /INSTALL/);
assert.match(html, /EXECUTION/);
assert.match(html, /PAYMENTS/);
assert.match(html, /VOTING/);
assert.match(html, /Skip to plugin candidates/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /forced-colors/);
assert.match(css, /focus-visible/);
assert.equal(state.release_unit, 'public-plugin-governance-gate-v1');
assert.equal(state.mode, 'PROTECTED_BETA_FIXTURE');
assert.equal(state.owner_8x8_id, '0000000001');
assert.equal(state.live_plugins, 0);
assert.equal(state.installed_plugins, 0);
assert.equal(state.executions, 0);
assert.equal(state.payments, 0);
assert.equal(state.votes_cast, 0);
assert.equal(state.private_core_connected, false);
assert.equal(state.fixture_candidates.length, 4);
assert.ok(state.requirements.some((item) => item.id === 'security'));
assert.ok(state.requirements.some((item) => item.id === 'sandbox'));
assert.ok(state.requirements.some((item) => item.id === 'governance' && item.state === 'BLOCKED'));
assert.doesNotMatch(app, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
assert.doesNotMatch(app, /localStorage|sessionStorage|document\.cookie/);
assert.doesNotMatch(app, /WebSocket|EventSource|getUserMedia|navigator\.bluetooth/);
assert.doesNotMatch(app, /wallet|signTransaction|sendTransaction|checkout|paymentRequest/i);

console.log(JSON.stringify({
  status: 'PASS',
  release_unit: state.release_unit,
  checks: 30,
  live_plugins: state.live_plugins,
  installed_plugins: state.installed_plugins,
  executions: state.executions,
  payments: state.payments,
  votes_cast: state.votes_cast,
}));
