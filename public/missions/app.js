const form = document.querySelector('#missionBuilder');
const state = document.querySelector('#packetState');
const output = document.querySelector('#packetOutput');
const status = document.querySelector('#formStatus');
const copyButton = document.querySelector('#copyButton');
const resetButton = document.querySelector('#resetButton');

let currentPacket = '';

function selectedAuthority() {
  const selected = document.querySelector('input[name="authority"]:checked');
  return selected ? selected.value : 'READ_ONLY';
}

function normalizeText(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function buildPacket() {
  const packet = {
    contract_version: '8x8-public-mission-draft-v1',
    owner_8x8_id: '0000000001',
    mission_type: document.querySelector('#missionType').value,
    public_target: normalizeText(document.querySelector('#target').value),
    measurable_goal: normalizeText(document.querySelector('#goal').value),
    required_evidence: document.querySelector('#evidence').value,
    authority_ceiling: selectedAuthority(),
    maximum_minutes: Number(document.querySelector('#budget').value),
    execution_enabled: false,
    network_send_enabled: false,
    persistence_enabled: false,
    private_core_connected: false,
    live_agent_assigned: false,
    required_future_gates: [
      'verified_sender_and_recipient_ids',
      'capability_allowlist',
      'expiry_and_budget',
      'queue_lease_and_idempotency',
      'privacy_classification',
      'signed_result_receipt',
      'abuse_controls_and_emergency_revoke'
    ]
  };
  return JSON.stringify(packet, null, 2);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  currentPacket = buildPacket();
  output.textContent = currentPacket;
  state.textContent = 'LOCAL_DRAFT_READY';
  status.textContent = 'Local draft created. Nothing was stored, sent or executed.';
  copyButton.disabled = false;
  output.focus();
});

resetButton.addEventListener('click', () => {
  currentPacket = '';
  state.textContent = 'EMPTY';
  output.textContent = 'Create a bounded mission draft to preview its normalized contract.';
  status.textContent = 'Mission draft cleared from this page.';
  copyButton.disabled = true;
});

copyButton.addEventListener('click', async () => {
  if (!currentPacket || !navigator.clipboard) {
    status.textContent = 'Clipboard is unavailable. Select and copy the packet manually.';
    return;
  }
  try {
    await navigator.clipboard.writeText(currentPacket);
    status.textContent = 'Draft copied. No network request was made by this application.';
  } catch {
    status.textContent = 'Copy was denied. Select and copy the packet manually.';
  }
});
