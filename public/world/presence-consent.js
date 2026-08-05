const fixture = Object.freeze([
  { id: 'fixture-seraphim-01', label: 'Seraphim Guide', zone: 'GENESIS PLAZA', role: 'PUBLIC GUIDE', ageSeconds: 12 },
  { id: 'fixture-builder-02', label: 'Builder Fixture', zone: 'CREATOR QUARTER', role: 'SYNTHETIC BUILDER', ageSeconds: 38 },
  { id: 'fixture-reviewer-03', label: 'Safety Reviewer Fixture', zone: 'GOVERNANCE RING', role: 'SYNTHETIC REVIEWER', ageSeconds: 55 }
]);

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/world/presence-consent.css';
document.head.append(style);

const card = document.createElement('article');
card.className = 'glass card presence-consent-card';
card.setAttribute('aria-labelledby', 'presenceConsentTitle');
card.innerHTML = `
  <p class="eyebrow">PRIVACY-SAFE PRESENCE</p>
  <h2 id="presenceConsentTitle">Coarse-zone consent preview</h2>
  <p class="presence-boundary">Fixture-only presence. No precise coordinates, account lookup, network transmission, storage, cookies, Bluetooth, Wi-Fi, camera or microphone.</p>
  <div class="presence-consent-grid">
    <div class="presence-consent-controls">
      <label for="presenceZone">Coarse public zone</label>
      <select id="presenceZone"><option>GENESIS PLAZA</option><option>CREATOR QUARTER</option><option>GOVERNANCE RING</option></select>
      <label for="presenceDuration">Consent expiry</label>
      <select id="presenceDuration"><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="120">120 seconds</option></select>
      <div class="presence-consent-actions">
        <button id="presenceConsentButton" type="button" aria-pressed="false">Enable synthetic presence</button>
        <button id="presenceClearButton" type="button" disabled>Clear now</button>
      </div>
      <p id="presenceConsentStatus" class="presence-status" role="status" aria-live="polite">Consent is off.</p>
      <div class="presence-consent-facts" aria-label="Presence truth state">
        <div><span>LIVE PEOPLE</span><b>0</b></div><div><span>EXPIRES IN</span><b id="presenceCountdown">OFF</b></div><div><span>TRANSMISSION</span><b>NONE</b></div>
      </div>
    </div>
    <div>
      <h3>Visible fixture roster</h3>
      <ul id="presenceRoster" class="presence-roster"></ul>
    </div>
  </div>`;

document.querySelector('.dashboard-grid')?.prepend(card);

const consentButton = document.querySelector('#presenceConsentButton');
const clearButton = document.querySelector('#presenceClearButton');
const duration = document.querySelector('#presenceDuration');
const zone = document.querySelector('#presenceZone');
const roster = document.querySelector('#presenceRoster');
const status = document.querySelector('#presenceConsentStatus');
const countdown = document.querySelector('#presenceCountdown');
let expiresAt = 0;
let timer = null;

function setStatus(message) { status.textContent = message; }
function renderRoster(active) {
  roster.replaceChildren();
  for (const entry of active ? fixture : []) {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    const facts = document.createElement('span');
    name.textContent = entry.label;
    facts.textContent = `${entry.role} · ${entry.zone} · fixture age ${entry.ageSeconds}s`;
    item.append(name, facts);
    roster.append(item);
  }
  if (!active) {
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
