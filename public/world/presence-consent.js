const fixture = Object.freeze([
  { id: 'fixture-seraphim-01', label: 'Seraphim Guide', zone: 'GENESIS PLAZA', role: 'PUBLIC GUIDE', ageSeconds: 12 },
  { id: 'fixture-builder-02', label: 'Builder Fixture', zone: 'CREATOR QUARTER', role: 'SYNTHETIC BUILDER', ageSeconds: 38 },
  { id: 'fixture-reviewer-03', label: 'Safety Reviewer Fixture', zone: 'GOVERNANCE RING', role: 'SYNTHETIC REVIEWER', ageSeconds: 55 }
]);

const consentButton = document.querySelector('#presenceConsentButton');
const clearButton = document.querySelector('#presenceClearButton');
const duration = document.querySelector('#presenceDuration');
const zone = document.querySelector('#presenceZone');
const roster = document.querySelector('#presenceRoster');
const status = document.querySelector('#presenceConsentStatus');
const countdown = document.querySelector('#presenceCountdown');

let expiresAt = 0;
let timer = null;

function setStatus(message) {
  status.textContent = message;
}

function renderRoster(active) {
  roster.replaceChildren();
  const entries = active ? fixture : [];
  for (const entry of entries) {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    const facts = document.createElement('span');
    name.textContent = entry.label;
    facts.textContent = `${entry.role} · ${entry.zone} · fixture age ${entry.ageSeconds}s`;
    item.append(name, facts);
    roster.append(item);
  }
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No presence fixtures visible. Consent is off.';
    roster.append(empty);
  }
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

consentButton?.addEventListener('click', () => {
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

clearButton?.addEventListener('click', () => clearConsent());
window.addEventListener('pagehide', () => clearConsent('Presence cleared when leaving the page.'));
renderRoster(false);
