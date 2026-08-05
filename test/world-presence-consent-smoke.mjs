import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../public/world/presence-consent.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/world/presence-consent.css', import.meta.url), 'utf8');
const accessibility = await readFile(new URL('../public/world/accessibility.js', import.meta.url), 'utf8');

const checks = [
  ['world imports presence slice', accessibility.includes("import './presence-consent.js'")],
  ['fixture is immutable', js.includes('Object.freeze')],
  ['fixture identity is explicit', js.includes('fixture-seraphim-01')],
  ['live people truth is zero', js.includes('<b>0</b>')],
  ['transmission truth is none', js.includes('<b>NONE</b>')],
  ['coarse zones only', ['GENESIS PLAZA','CREATOR QUARTER','GOVERNANCE RING'].every((value) => js.includes(value))],
  ['explicit consent control', js.includes('presenceConsentButton') && js.includes('aria-pressed')],
  ['manual clear control', js.includes('presenceClearButton')],
  ['automatic expiry', js.includes('expiresAt') && js.includes('setInterval') && js.includes('expired automatically')],
  ['page exit clears', js.includes('pagehide') && js.includes('clearConsent')],
  ['screen reader status', js.includes('role="status"') && js.includes('aria-live="polite"')],
  ['DOM safe roster', js.includes('textContent') && js.includes('replaceChildren')],
  ['no browser storage', !/localStorage|sessionStorage|document\.cookie/.test(js)],
  ['no network calls', !/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(js)],
  ['no precise geolocation', !/navigator\.geolocation|getCurrentPosition|watchPosition/.test(js)],
  ['no device capture', !/getUserMedia|bluetooth|serial|usb/i.test(js)],
  ['no wallet or payment API', !/ethereum|solana|paymentrequest|checkout|transaction\.sign/i.test(js)],
  ['responsive layout', css.includes('@media(max-width:760px)')],
  ['reduced motion', css.includes('prefers-reduced-motion')],
  ['forced colors', css.includes('forced-colors:active')],
  ['minimum touch target', css.includes('min-height:44px')],
  ['existing route extended', js.includes("document.querySelector('.dashboard-grid')?.prepend(card)")],
  ['no second cockpit route', !/window\.location|history\.pushState/.test(js)],
  ['strict self-hosted stylesheet', js.includes("'/world/presence-consent.css'")]
];

for (const [name, pass] of checks) assert.equal(pass, true, name);
console.log(`WORLD_PRESENCE_CONSENT_CHECKS=${checks.length}_PASS`);
