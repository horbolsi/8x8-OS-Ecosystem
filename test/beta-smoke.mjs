import assert from "node:assert/strict";
import http from "node:http";
import app, { RELEASE } from "../server/app.js";

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

try {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.json.status, "ok");
  assert.equal(health.json.release_id, RELEASE.release_id);
  assert.equal(health.json.mutation_routes_enabled, false);

  const release = await request("/api/v1/release");
  assert.equal(release.response.status, 200);
  assert.equal(release.json.public_mode, true);
  assert.equal(release.json.private_data_mounted, false);
  assert.equal(release.json.credential_access_enabled, false);
  assert.match(release.json.integrity, /^[a-f0-9]{24}$/);

  const state = await request("/api/v1/public/state");
  assert.equal(state.response.status, 200);
  assert.equal(state.json.agents.length, 8);
  assert.equal(state.json.monitors[1].state, "LOCKED");
  assert.equal(state.json.claims.private_records_exposed, false);

  for (const path of [
    "/api/v1/private/state",
    "/api/admin/verify",
    "/api/trade",
    "/api/stake",
    "/api/nfts/mint",
    "/api/social/posts",
  ]) {
    const blocked = await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(blocked.response.status, 404, `${path} must remain unavailable`);
    assert.equal(blocked.json.error, "not_available_in_public_beta");
  }

  const root = await request("/");
  assert.equal(root.response.status, 200);
  assert.match(root.text, /8x8 OS — Dual Monitor Beta/);
  assert.match(root.response.headers.get("content-security-policy") || "", /default-src 'self'/);
  assert.equal(root.response.headers.get("x-frame-options"), "DENY");
  assert.equal(root.response.headers.get("permissions-policy"), "camera=(), microphone=(), geolocation=(), payment=(), usb=()");

  console.log(JSON.stringify({
    status: "PASS",
    release_id: RELEASE.release_id,
    tests: 23,
    public_private_boundary: "PASS",
    mutation_routes: "DISABLED",
    credential_access: "DISABLED",
  }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
