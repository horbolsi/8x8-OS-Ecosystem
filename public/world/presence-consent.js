const fixture = Object.freeze([
  { id: 'fixture-seraphim-01', label: 'Seraphim Guide', zone: 'GENESIS PLAZA', role: 'PUBLIC GUIDE', ageSeconds: 12 },
  { id: 'fixture-builder-02', label: 'Builder Fixture', zone: 'CREATOR QUARTER', role: 'SYNTHETIC BUILDER', ageSeconds: 38 },
  { id: 'fixture-reviewer-03', label: 'Safety Reviewer Fixture', zone: 'GOVERNANCE RING', role: 'SYNTHETIC REVIEWER', ageSeconds: 55 }
]);

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.id) node.id = options.id;
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs || {})) node.setAttribute(name, value);
  return node;
}
function labeledSelect(id, labelText, values) {
  const label = element('label', { text: labelText, attrs: { for: id } });
  const select = element('select', { id });
  for (const [value, text] of values) {
    const option = element('option', { text });
    option.value = value;
    select.append(option);
  }
  return [label, select];
}
function fact(label, value, valueId) {
  const box = element('div');
  box.append(element('span', { text: label }), element('b', { id: valueId, text: value }));
  return box;
}

const style = element('link', { attrs: { rel: 'stylesheet', href: '/world/presence-consent.css' } });
document.head.append(style);

const card = element('article', { className: 'glass card presence-consent-card', attrs: { 'aria-labelledby': 'presenceConsentTitle' } });
card.append(
  element('p', { className: 'eyebrow', text: 'PRIVACY-SAFE PRESENCE' }),
  element('h2', { id: 'presenceConsentTitle', text: 'Coarse-zone consent preview' }),
  element('p', { className: 'presence-boundary', text: 'Fixture-only presence. No precise coordinates, account lookup, network transmission, storage, cookies, Bluetooth, Wi-Fi, camera or microphone.' })
);
const grid = element('div', { className: 'presence-consent-grid' });
const controls = element('div', { className: 'presence-consent-controls' });
controls.append(...labeledSelect('presenceZone', 'Coarse public zone', [
  ['GENESIS PLAZA', 'GENESIS PLAZA'], ['CREATOR QUARTER', 'CREATOR QUARTER'], ['GOVERNANCE RING', 'GOVERNANCE RING']
]));
controls.append(...labeledSelect('presenceDuration', 'Consent expiry', [['30','30 seconds'],['60','60 seconds'],['120','120 seconds']]));
const actions = element('div', { className: 'presence-consent-actions' });
const consentButton = element('button', { id: 'presenceConsentButton', text: 'Enable synthetic presence', attrs: { type: 'button', 'aria-pressed': 'false' } });
const clearButton = element('button', { id: 'presenceClearButton', text: 'Clear now', attrs: { type: 'button' } });
clearButton.disabled = true;
actions.append(consentButton, clearButton);
const status = element('p', { id: 'presenceConsentStatus', className: 'presence-status', text: 'Consent is off.', attrs: { role: 'status', 'aria-live': 'polite' } });
const facts = element('div', { className: 'presence-consent-facts', attrs: { 'aria-label': 'Presence truth state' } });
facts.append(fact('LIVE PEOPLE', '0'), fact('EXPIRES IN', 'OFF', 'presenceCountdown'), fact('TRANSMISSION', 'NONE'));
controls.append(actions, status, facts);
const rosterPanel = element('div');
rosterPanel.append(element('h3', { text: 'Visible fixture roster' }));
const roster = element('ul', { id: 'presenceRoster', className: 'presence-roster' });
rosterPanel.append(roster);
grid.append(controls, rosterPanel);
card.append(grid);
document.querySelector('.dashboard-grid')?.prepend(card);

const duration = document.querySelector('#presenceDuration');
const zone = document.querySelector('#presenceZone');
const countdown = document.querySelector('#presenceCountdown');
let expiresAt = 0;
let timer = null;
function setStatus(message) { status.textContent = message; }
function renderRoster(active) {
  roster.replaceChildren();
  for (const entry of active ? fixture : []) {
    const item = element('li');
    item.append(element('strong', { text: entry.label }), element('span', { text: `${entry.role} · ${entry.zone} · fixture age ${entry.ageSeconds}s` }));
    roster.append(item);
  }
  if (!active) roster.append(element('li', { text: 'No presence fixtures visible. Consent is off.' }));
}
function clearConsent(reason = 'Presence consent cleared.') {
  expiresAt = 0;
  if (timer) window.clearInterval(timer);
  timer = null;
  countdown.textContent = 'OFF';
  consentButton.setAttribute('aria-pressed', 'false');
  clearButton.disabled = true;
  renderRoster(false);
  setStatus(reason);
}
function updateCountdown() {
  const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  countdown.textContent = remaining ? `${remaining}s` : 'OFF';
  if (!remaining) clearConsent('Presence consent expired automatically.');
}
consentButton.addEventListener('click', () => {
  const seconds = Number(duration.value);
  expiresAt = Date.now() + seconds * 1000;
  consentButton.setAttribute('aria-pressed', 'true');
  clearButton.disabled = false;
  renderRoster(true);
  setStatus(`Synthetic coarse-zone presence enabled for ${seconds} seconds in ${zone.value}. Nothing is stored or transmitted.`);
  if (timer) window.clearInterval(timer);
  timer = window.setInterval(updateCountdown, 1000);
  updateCountdown();
});
clearButton.addEventListener('click', () => clearConsent());
window.addEventListener('pagehide', () => clearConsent('Presence cleared when leaving the page.'));
renderRoster(false);
