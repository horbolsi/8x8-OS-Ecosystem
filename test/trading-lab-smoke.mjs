import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import app from '../server/app.js';

const html = fs.readFileSync('public/trading-lab/index.html', 'utf8');
const state = JSON.parse(fs.readFileSync('public/trading-lab/state.json', 'utf8'));

assert.match(html, /Trading Intelligence Synthetic Paper Lab/);
assert.match(html, /SYNTHETIC DATA/);
assert.match(html, /NO LIVE ORDERS/);
assert.match(html, /No strategy is approved for live use/);
assert.equal(state.releaseUnit, 'trading-analytics-public-beta-v2');
assert.equal(state.mode, 'PUBLIC_SAFE_SYNTHETIC_PAPER_ONLY');
assert.ok(state.labels.includes('NO_PROFITABILITY_CLAIM'));
assert.equal(state.syntheticSnapshot.orders, 128);
assert.equal(state.syntheticSnapshot.rejected, 8);
assert.equal(state.rollback.privateDependencies, false);
assert.equal(state.rollback.financialSideEffects, false);
assert.doesNotMatch(`${html}\n${JSON.stringify(state)}`, /BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY|github_pat_|gh[pousr]_|sk-[A-Za-z0-9]{20,}|seed phrase/i);
assert.doesNotMatch(`${html}\n${JSON.stringify(state)}`, /WalletConnect|ccxt|binance|coinbase|kraken|bitget|place[_-]?order|create[_-]?order/i);

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

try {
  const page = await fetch(`http://127.0.0.1:${port}/trading-lab/`);
  const pageText = await page.text();
  assert.equal(page.status, 200);
  assert.match(pageText, /Trading Intelligence Synthetic Paper Lab/);
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.match(page.headers.get('content-security-policy') || '', /default-src 'self'/);
  assert.equal(
    page.headers.get('permissions-policy'),
    "camera=(), microphone=(), geolocation=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), usb=(), bluetooth=()",
  );

  const stateResponse = await fetch(`http://127.0.0.1:${port}/trading-lab/state.json`);
  assert.equal(stateResponse.status, 200);
  const servedState = await stateResponse.json();
  assert.equal(servedState.releaseUnit, state.releaseUnit);
  assert.equal(servedState.rollback.financialSideEffects, false);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({status:'PASS',release_unit:state.releaseUnit,checks:18,live_orders:0,exchange_connected:false,wallet_connected:false,financial_side_effects:false}));
