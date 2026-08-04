import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { spawnSync } from "node:child_process";
import app from "../server/app.js";

const syntax = spawnSync(process.execPath, ["--check", "public/world/app.js"], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

const state = JSON.parse(fs.readFileSync("public/world/state.json", "utf8"));
assert.equal(state.schema_version, "8x8.public-world.v1");
assert.equal(state.mode, "PUBLIC_BROWSER_BETA_LOCAL_ONLY");
assert.equal(state.score.earned, 100);
assert.equal(state.score.possible, 100);
assert.equal(state.score.whole_system_score, "NOT_INFERRED");
assert.equal(state.owner_preview.id, "0000000001");
assert.equal(state.owner_preview.authenticated, false);
assert.equal(state.privacy.default_presence, "HIDDEN");
assert.equal(state.privacy.live_user_count, 0);
assert.equal(state.privacy.coordinates_uploaded, false);
assert.equal(state.privacy.coordinates_persisted, false);
assert.equal(state.privacy.coordinates_shared_with_users, false);
assert.equal(state.public_boundaries.private_core_connected, false);
assert.equal(state.public_boundaries.user_database_connected, false);
assert.equal(state.public_boundaries.wallet_data_connected, false);
assert.equal(state.public_boundaries.financial_execution_enabled, false);
assert.equal(state.public_boundaries.remote_device_control_enabled, false);
assert.equal(state.services.length, 12);
assert.equal(state.synthetic_beacons.length, 5);

const scriptOnDisk = fs.readFileSync("public/world/app.js", "utf8");
for (const required of [
  "navigator.geolocation.getCurrentPosition",
  "DeviceOrientationEvent.requestPermission",
  "deviceorientation",
  "REGION_APPROXIMATE",
  "PRECISE_TEMPORARY",
  "https://www.google.com/maps/search/",
  "https://maps.apple.com/",
  "coordinates_uploaded",
  "live_user_count",
  "document.createElement",
  "replaceChildren",
]) {
  assert.match(scriptOnDisk, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const forbidden of [
  ".innerHTML",
  ".outerHTML",
  "insertAdjacentHTML",
  "document.write",
  ".style.",
  "setAttribute(\"style\"",
  "localStorage",
  "sessionStorage",
  "document.cookie",
  "WebSocket(",
  "EventSource(",
  "getUserMedia(",
  "navigator.bluetooth.requestDevice",
]) {
  assert.doesNotMatch(scriptOnDisk, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function request(path) {
  const response = await fetch(`${base}${path}`, { redirect: "error" });
  return { response, text: await response.text() };
}

try {
  const page = await request("/world/");
  assert.equal(page.response.status, 200);
  assert.match(page.text, /8x8 World Public Browser Beta/);
  assert.match(page.text, /SERAPHIM PUBLIC GUIDE/);
  assert.match(page.text, /Enable local location/);
  assert.match(page.text, /Enable gyroscope/);
  assert.match(page.text, /ZERO REMOTE PLAYERS/);
  assert.match(page.text, /0000000001/);

  const csp = page.response.headers.get("content-security-policy") || "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.equal(page.response.headers.get("x-frame-options"), "DENY");
  assert.equal(page.response.headers.get("referrer-policy"), "no-referrer");

  const worldPolicy = page.response.headers.get("permissions-policy") || "";
  assert.match(worldPolicy, /geolocation=\(self\)/);
  assert.match(worldPolicy, /accelerometer=\(self\)/);
  assert.match(worldPolicy, /gyroscope=\(self\)/);
  assert.match(worldPolicy, /magnetometer=\(self\)/);
  assert.match(worldPolicy, /camera=\(\)/);
  assert.match(worldPolicy, /microphone=\(\)/);
  assert.match(worldPolicy, /bluetooth=\(\)/);

  const artBoard = await request("/art-board/");
  assert.equal(artBoard.response.status, 200);
  const otherPolicy = artBoard.response.headers.get("permissions-policy") || "";
  assert.match(otherPolicy, /geolocation=\(\)/);
  assert.match(otherPolicy, /gyroscope=\(\)/);

  const worldState = await request("/world/state.json");
  assert.equal(worldState.response.status, 200);
  const parsed = JSON.parse(worldState.text);
  assert.equal(parsed.release_unit_id, "public-8x8-world-browser-v1");
  assert.equal(parsed.privacy.live_user_count, 0);
  assert.equal(parsed.public_boundaries.wallet_data_connected, false);

  const script = await request("/world/app.js");
  assert.equal(script.response.status, 200);
  assert.doesNotMatch(script.text, /\.innerHTML|\.style\.|localStorage|WebSocket\(|EventSource\(/);

  const styles = await request("/world/styles.css");
  assert.equal(styles.response.status, 200);
  assert.match(styles.text, /data-x="10"/);
  assert.match(styles.text, /data-heading-index="15"/);
  assert.match(styles.text, /prefers-reduced-motion/);
  assert.match(styles.text, /forced-colors/);

  const manifest = await request("/world/manifest.webmanifest");
  assert.equal(manifest.response.status, 200);
  const parsedManifest = JSON.parse(manifest.text);
  assert.equal(parsedManifest.start_url, "/world/");
  assert.equal(parsedManifest.display, "standalone");

  const capabilities = await request("/api/v1/world/capabilities");
  assert.equal(capabilities.response.status, 200);
  const capabilityData = JSON.parse(capabilities.text);
  assert.equal(capabilityData.state, "PUBLIC_BROWSER_LOCAL_ONLY");
  assert.equal(capabilityData.live_users, 0);
  assert.equal(capabilityData.location_upload, false);
  assert.equal(capabilityData.bluetooth_scan, false);
  assert.equal(capabilityData.payments, false);
  assert.equal(capabilityData.wallet_signing, false);
  assert.equal(capabilityData.remote_device_control, false);

  console.log(JSON.stringify({
    status: "PASS",
    release_unit_id: parsed.release_unit_id,
    score: "100/100",
    route: "/world/",
    movement: true,
    local_geolocation_permission: true,
    local_orientation_permission: true,
    live_users: 0,
    coordinates_uploaded: false,
    bluetooth_scan: false,
    wallet_signing: false,
    private_core: false,
  }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
