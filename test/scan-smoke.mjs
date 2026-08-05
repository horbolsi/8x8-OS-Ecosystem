import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('public/scan/index.html', 'utf8');
const script = fs.readFileSync('public/scan/app.js', 'utf8');
const css = fs.readFileSync('public/scan/styles.css', 'utf8');
const state = JSON.parse(fs.readFileSync('public/scan/state.json', 'utf8'));

assert.match(html, /8x8Scan Testnet Catalog/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /Skip to catalog/);
assert.match(html, /role="status"/);
assert.equal(state.release_unit, 'public-8x8scan-testnet-catalog-v1');
assert.equal(state.mode, 'PROTECTED_BETA_FIXTURE');
assert.equal(state.owner.id, '0000000001');
assert.equal(state.assets.length, 9);
assert.equal(state.networks.length, 6);
assert.equal(state.truth.live_chain_queries, false);
assert.equal(state.truth.wallet_connected, false);
assert.equal(state.truth.signing_enabled, false);
assert.equal(state.truth.mainnet_actions, 0);
assert.equal(state.truth.testnet_deployments, 0);
assert.equal(state.truth.private_addresses_exposed, false);
assert.ok(state.networks.every((network) => network.environment !== 'MAINNET'));
assert.equal(state.assets.filter((asset) => asset.supply === null).length, 6);
assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|localStorage|sessionStorage|WebSocket|EventSource|navigator\.bluetooth|getUserMedia/);
assert.match(script, /textContent/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /forced-colors/);
assert.match(css, /focus-visible/);
assert.doesNotMatch(`${html}\n${script}\n${JSON.stringify(state)}`, /BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|github_pat_|gh[pousr]_|sk-[A-Za-z0-9]{20,}|seed phrase|mnemonic/);

console.log(JSON.stringify({status:'PASS', release_unit:state.release_unit, checks:24, assets:9, networks:6, live_queries:false, signing:false, mainnet_actions:0}));
