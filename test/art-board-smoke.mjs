import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import app from "../server/app.js";

const syntax = spawnSync(process.execPath, ["--check", "public/art-board/app.js"], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout);

const stateOnDisk = JSON.parse(fs.readFileSync("public/art-board/state.json", "utf8"));
assert.equal(stateOnDisk.schema_version, "8x8.public-art-board.v1");
assert.equal(stateOnDisk.mode, "PUBLIC_SAFE_FIXTURE");
assert.equal(stateOnDisk.score.earned, 100);
assert.equal(stateOnDisk.score.possible, 100);
assert.equal(stateOnDisk.score.whole_system_score, "NOT_INFERRED");
assert.equal(stateOnDisk.worlds.length, 8);
assert.ok(stateOnDisk.presence_clusters.every((cluster) => cluster.count === 0));
assert.equal(stateOnDisk.treasury.public_balances, false);
assert.equal(stateOnDisk.treasury.wallet_addresses, false);
assert.equal(stateOnDisk.treasury.signing_authority, false);
assert.ok(fs.existsSync("public/art-board/positions.css"));

const server = http.createServer(app);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

async function request(path) {
  const response = await fetch(`${base}${path}`, { redirect: "error" });
  return { response, text: await response.text() };
}

try {
  const page = await request("/art-board/");
  assert.equal(page.response.status, 200);
  assert.match(page.text, /8x8 Global Art Board Preview/);
  assert.match(page.text, /SERAPHIM PUBLIC GUIDE/);
  assert.match(page.text, /positions\.css/);
  const csp = page.response.headers.get("content-security-policy") || "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-inline/);
  assert.equal(page.response.headers.get("x-frame-options"), "DENY");

  const state = await request("/art-board/state.json");
  const parsed = JSON.parse(state.text);
  assert.equal(parsed.release_unit_id, "public-global-art-board-v1");
  assert.equal(parsed.score.earned, 100);
  assert.equal(parsed.score.whole_system_score, "NOT_INFERRED");

  const script = await request("/art-board/app.js");
  assert.equal(script.response.status, 200);
  for (const token of ["PUBLIC_SAFE_FIXTURE", "boundedPercent", "dataset.zoom", "document.createElement", "document.createTextNode", "replaceChildren", "pointercancel", "lostpointercapture"]) {
    assert.match(script.text, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(script.text, /\.innerHTML|\.style|Math\.random/);

  const positions = await request("/art-board/positions.css");
  assert.equal(positions.response.status, 200);
  assert.match(positions.text, /data-zoom="100"/);
  assert.match(positions.text, /world\[data-position="0"\]/);

  console.log(JSON.stringify({
    status: "PASS",
    release_unit_id: parsed.release_unit_id,
    score: "100/100",
    whole_system_inferred: false,
    route: "/art-board/",
    live_users: 0,
    wallet_data: false,
    private_control_plane: false,
    unsafe_inline: false,
    dynamic_html_sinks: 0,
  }));
} finally {
  await new Promise((resolve) => server.close(resolve));
}
