import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/missions/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/missions/styles.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../public/missions/app.js', import.meta.url), 'utf8');

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('route title', html.includes('<title>8x8 Agent Missions</title>'));
check('strict csp', html.includes("default-src 'self'") && html.includes("connect-src 'none'"));
check('skip link', html.includes('href="#missionBuilder"'));
check('owner id', html.includes('0000000001') && js.includes("owner_8x8_id: '0000000001'"));
check('live agents zero', html.includes('<span>LIVE AGENTS</span><b>0</b>'));
check('execution off', html.includes('<span>REMOTE EXECUTION</span><b>OFF</b>'));
check('network send off', html.includes('<span>NETWORK SEND</span><b>OFF</b>'));
check('private core disconnected', html.includes('<span>PRIVATE CORE</span><b>DISCONNECTED</b>'));
check('bounded authority options', ['READ_ONLY','DRAFT_ONLY','TEST_FIXTURE_ONLY'].every((item) => html.includes(item)));
check('budget capped', html.includes('max="120"'));
check('execution false in packet', js.includes('execution_enabled: false'));
check('network false in packet', js.includes('network_send_enabled: false'));
check('persistence false in packet', js.includes('persistence_enabled: false'));
check('no live agent assignment', js.includes('live_agent_assigned: false'));
check('future gates included', js.includes('queue_lease_and_idempotency') && js.includes('signed_result_receipt'));
check('dom safe rendering', js.includes('textContent') && !js.includes('innerHTML') && !js.includes('insertAdjacentHTML'));
check('no storage', !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(js));
check('no network api', !/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(js));
check('no sensitive browser api', !/geolocation|getUserMedia|requestDevice|credentials\.get/.test(js));
check('no wallet api', !/ethereum\.request|solana\.connect|walletconnect/i.test(js));
check('accessible status', html.includes('aria-live="polite"'));
check('responsive layout', css.includes('@media(max-width:700px)'));
check('reduced motion', css.includes('prefers-reduced-motion'));
check('forced colors', css.includes('forced-colors:active'));

console.log(JSON.stringify({status:'PASS', release_unit:'public-agent-mission-drafts-v1', checks:checks.length, execution:false, network_send:false, persistence:false}));
