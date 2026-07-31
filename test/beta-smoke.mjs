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

const telegramEnvNames = [
  "TELEGRAM_OWNER_BOT_TOKEN",
  "TELEGRAM_OWNER_WEBHOOK_SECRET",
  "TELEGRAM_OWNER_USER_ID",
  "TELEGRAM_SERAPHIM_BOT_TOKEN",
  "TELEGRAM_SERAPHIM_WEBHOOK_SECRET",
  "PUBLIC_MINI_APP_URL",
];
const originalTelegramEnv = Object.fromEntries(
  telegramEnvNames.map((name) => [name, process.env[name]]),
);
for (const name of telegramEnvNames) delete process.env[name];

try {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.json.status, "ok");
  assert.equal(health.json.release_id, RELEASE.release_id);
  assert.equal(health.json.mutation_routes_enabled, false);
  assert.equal(health.json.cloud_telegram_relay, "BOUNDED_V1");

  const release = await request("/api/v1/release");
  assert.equal(release.response.status, 200);
  assert.equal(release.json.public_mode, true);
  assert.equal(release.json.private_data_mounted, false);
  assert.equal(release.json.credential_access_enabled, false);
  assert.match(release.json.integrity, /^[a-f0-9]{24}$/);

  const relay = await request("/api/v1/cloud-relay");
  assert.equal(relay.response.status, 200);
  assert.equal(relay.json.state, "CLOUD_RELAY_CODE_DEPLOYED");
  assert.equal(relay.json.owner_bot_configured, false);
  assert.equal(relay.json.seraphim_bot_configured, false);
  assert.equal(relay.json.private_plane_exposed, false);
  assert.equal(relay.json.arbitrary_shell_enabled, false);
  assert.equal(relay.json.edge_execution_enabled, false);
  assert.equal(relay.json.financial_actions_enabled, false);

  const ownerUnconfigured = await request("/api/telegram/owner", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ update_id: 1 }),
  });
  assert.equal(ownerUnconfigured.response.status, 503);
  assert.equal(ownerUnconfigured.json.state, "TELEGRAM_RELAY_NOT_CONFIGURED");

  process.env.TELEGRAM_OWNER_BOT_TOKEN = "test-token-not-a-real-telegram-credential";
  process.env.TELEGRAM_OWNER_WEBHOOK_SECRET = "test-webhook-secret-123456789";
  process.env.TELEGRAM_OWNER_USER_ID = "888000111";

  const ownerBadSecret = await request("/api/telegram/owner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "wrong-secret",
    },
    body: JSON.stringify({ update_id: 2 }),
  });
  assert.equal(ownerBadSecret.response.status, 401);
  assert.equal(ownerBadSecret.json.error, "INVALID_WEBHOOK_SECRET");

  const ownerNotAllowlisted = await request("/api/telegram/owner", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": process.env.TELEGRAM_OWNER_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      update_id: 3,
      message: {
        text: "/status",
        chat: { id: 777 },
        from: { id: 999000222, first_name: "Not Owner" },
      },
    }),
  });
  assert.equal(ownerNotAllowlisted.response.status, 200);
  assert.equal(ownerNotAllowlisted.json.ignored, true);
  assert.equal(ownerNotAllowlisted.json.reason, "OWNER_NOT_ALLOWLISTED");

  delete process.env.TELEGRAM_OWNER_BOT_TOKEN;
  delete process.env.TELEGRAM_OWNER_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_OWNER_USER_ID;

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
    const blocked = await request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
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
    tests: 38,
    public_private_boundary: "PASS",
    cloud_telegram_relay: "BOUNDED_NOT_CONFIGURED",
    mutation_routes: "DISABLED",
    credential_access: "DISABLED",
  }));
} finally {
  for (const [name, value] of Object.entries(originalTelegramEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await new Promise((resolve) => server.close(resolve));
}
