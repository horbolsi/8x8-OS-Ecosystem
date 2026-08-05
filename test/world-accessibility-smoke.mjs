import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync("public/world/index.html", "utf8");
const script = fs.readFileSync("public/world/accessibility.js", "utf8");
const css = fs.readFileSync("public/world/accessibility.css", "utf8");

assert.match(html, /class="skip-link" href="#worldViewport"/);
assert.match(html, /id="worldInstructions" class="sr-only"/);
assert.match(html, /id="travelerAnnouncement"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
assert.match(html, /id="worldViewport"[^>]+aria-describedby="worldInstructions"/);
assert.match(html, /href="\/world\/accessibility\.css"/);
assert.match(html, /src="\/world\/accessibility\.js"/);

assert.match(script, /currentTravelerMessage/);
assert.match(script, /requestAnimationFrame/);
assert.match(script, /Selected service:/);
assert.match(script, /Coordinates remain local to this browser session/);
assert.match(script, /previousFocus\.focus\(\)/);
assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|localStorage|sessionStorage|document\.cookie/);
assert.doesNotMatch(script, /getUserMedia|requestDevice|WebSocket|EventSource/);

assert.match(css, /\.skip-link:focus/);
assert.match(css, /\.sr-only/);
assert.match(css, /#worldViewport:focus-visible/);
assert.match(css, /prefers-reduced-motion/);

console.log(JSON.stringify({
  status: "PASS",
  release_unit: "world-traveler-accessibility-v1",
  checks: 19,
  precise_location_upload: false,
  financial_actions: false,
}));
