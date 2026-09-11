export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-8X8-Canonical-Root', 'fabric://8x8/core');
  res.setHeader('X-8X8-Effect', 'NON_BINDING_RESERVATION_INTENT_ONLY');

  if (req.method === 'GET') {
    return res.status(200).json({
      state: 'PRESENT_PROVEN_NON_BINDING_INTENT_ENDPOINT',
      canonical_root: 'fabric://8x8/core',
      payment_acceptance: false,
      sale_open: false,
      entitlement_created: false,
      durable_genesis_ledger: false,
      note: 'This endpoint can acknowledge prelaunch interest only. It does not reserve an NFT Vault slot, accept payment, create token rights, or create a paid Genesis entitlement.'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ state: 'METHOD_NOT_ALLOWED' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const selectedPlanMonths = Number(body.selected_plan_months || 1);
  const allowedPlans = new Set([1, 3, 6, 9, 12]);
  if (!allowedPlans.has(selectedPlanMonths)) {
    return res.status(400).json({ state: 'INVALID_PLAN', allowed_plan_months: [1, 3, 6, 9, 12] });
  }

  const clientIntent = String(body.client_intent_id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
  if (!clientIntent) {
    return res.status(400).json({ state: 'CLIENT_INTENT_ID_REQUIRED' });
  }

  const observedAt = new Date().toISOString();
  return res.status(202).json({
    state: 'RECEIVED_NON_BINDING_RESERVATION_INTENT',
    canonical_root: 'fabric://8x8/core',
    client_intent_id: clientIntent,
    observed_at: observedAt,
    selected_plan_months: selectedPlanMonths,
    reference_principal_usd: (8.88 * selectedPlanMonths).toFixed(2),
    genesis_target: 88888,
    planned_bundle_after_qualification_and_all_distribution_gates: {
      nft_vault_units: 1,
      locked_native_8x8_per_vault: 1,
      functional_token_units_each: selectedPlanMonths,
      functional_tokens: ['Tx8','Ux8','Fx8','XM8','0x8','TM8','Mx8','Sx8']
    },
    payment_accepted: false,
    payment_address_provided: false,
    sale_open: false,
    durable_ledger_write: false,
    entitlement_created: false,
    reservation_slot_held: false,
    next_required_state: 'AUTHENTICATED_8X8_ID_PLUS_VERIFIED_SETTLEMENT_AFTER_SALE_READINESS_PROMOTION',
    warning: 'Keep this receipt only as evidence of prelaunch interest. It is not a paid reservation, token sale, NFT sale, allocation, guarantee, or asset delivery.'
  });
}
