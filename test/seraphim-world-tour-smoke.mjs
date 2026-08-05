import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const js = await readFile(new URL('../public/world/seraphim-tour.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/world/seraphim-tour.css', import.meta.url), 'utf8');
const accessibility = await readFile(new URL('../public/world/accessibility.js', import.meta.url), 'utf8');
const stepIds = ['truth', 'movement', 'world', 'presence', 'portals'];

const checks = [
  ['loaded inside existing world', accessibility.includes("import './seraphim-tour.js'")],
  ['immutable guided steps', js.includes('Object.freeze')],
  ['five bounded steps', stepIds.every((id) => js.includes(`id: '${id}'`)) && !js.includes("id: 'sixth-step'")],
  ['truth state first', js.includes("id: 'truth'") && js.includes('zero live users')],
  ['movement and privacy explained', js.includes("id: 'movement'") && js.includes('explicit action')],
  ['synthetic world explained', js.includes("id: 'world'") && js.includes('not remote players')],
  ['presence expiry explained', js.includes("id: 'presence'") && js.includes('expires automatically')],
  ['governed portals explained', js.includes("id: 'portals'") && js.includes('payments')],
  ['explicit user gesture', js.includes("trigger.addEventListener('click'")],
  ['dialog semantics', js.includes("element('dialog'") && js.includes('aria-labelledby')],
  ['live progress', js.includes("'aria-live': 'polite'")],
  ['previous next close controls', ['seraphimTourPrevious','seraphimTourNext','seraphimTourClose'].every((id) => js.includes(id))],
  ['focus restored', js.includes('trigger.focus()')],
  ['escape cleanup', js.includes("addEventListener('cancel'") && js.includes('clearHighlight')],
  ['DOM safe construction', js.includes('document.createElement') && !/\.innerHTML|\.outerHTML|insertAdjacentHTML|document\.write/.test(js)],
  ['no persistence', !/localStorage|sessionStorage|document\.cookie|indexedDB/.test(js)],
  ['no network', !/fetch\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(js)],
  ['no device capture', !/getUserMedia\(|navigator\.(bluetooth|serial|usb)|requestDevice\(/.test(js)],
  ['no location access', !/navigator\.geolocation|getCurrentPosition\(|watchPosition\(/.test(js)],
  ['no wallet or payment API', !/window\.(ethereum|solana)|PaymentRequest|transaction\.sign/i.test(js)],
  ['rights-cleared provenance text', js.includes('rights-cleared guide fixture')],
  ['minimum touch targets', css.includes('min-height:44px')],
  ['phone reflow', css.includes('@media(max-width:640px)')],
  ['reduced motion', css.includes('prefers-reduced-motion:reduce')],
  ['forced colors', css.includes('forced-colors:active')],
  ['visible focus', css.includes(':focus-visible')],
  ['existing route only', !/window\.location|history\.pushState/.test(js)],
  ['self-hosted stylesheet', js.includes("'/world/seraphim-tour.css'")]
];

for (const [name, pass] of checks) assert.equal(pass, true, name);
console.log(JSON.stringify({ status: 'PASS', release_unit: 'seraphim-world-onboarding-v1', checks: checks.length, live_users: 0, persistence: false, network: false, financial_actions: false }));
