const SESSION_RE = /^cs_(?:test_|live_)?[A-Za-z0-9_]{8,240}$/;
const PLAN_MONTHS = new Set(['1', '3', '6', '9', '12']);

function addUtcMonths(epochSeconds, months) {
  const d = new Date(Number(epochSeconds) * 1000);
  if (!Number.isFinite(d.getTime())) return null;
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const endOfTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, endOfTargetMonth));
  return d.toISOString();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-8X8-Canonical-Root', 'fabric://8x8/core');
  res.setHeader('X-8X8-Payment-Verification', 'SERVER_TO_STRIPE');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeSecret) {
    return res.status(503).json({ state: 'BLOCKED_STRIPE_SECRET_NOT_CONFIGURED', credential_value_returned: false });
  }

  const sessionId = String(req.query?.session_id || '').trim();
  if (!SESSION_RE.test(sessionId)) return res.status(422).json({ error: 'INVALID_CHECKOUT_SESSION_ID' });

  const query = new URLSearchParams();
  query.append('expand[]', 'payment_intent.latest_charge');

  let response;
  let session;
  try {
    response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${stripeSecret}` },
      cache: 'no-store',
    });
    session = await response.json();
  } catch (error) {
    console.error('[8x8-payment-status] Stripe request failed', error?.name || 'FETCH_ERROR');
    return res.status(502).json({ state: 'PAYMENT_PROVIDER_UNREACHABLE' });
  }

  if (!response.ok || !session?.id) {
    return res.status(response.status === 404 ? 404 : 502).json({
      state: 'PAYMENT_SESSION_NOT_VERIFIABLE',
      provider_status: response.status,
      credential_value_returned: false,
    });
  }

  const metadata = session.metadata || {};
  const planRaw = String(metadata.plan_months || '');
  const planMonths = PLAN_MONTHS.has(planRaw) ? Number(planRaw) : null;
  const paymentIntent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  const charge = paymentIntent && typeof paymentIntent.latest_charge === 'object' ? paymentIntent.latest_charge : null;
  const paid = session.payment_status === 'paid' && paymentIntent?.status === 'succeeded' && charge?.paid === true;
  const disputed = charge?.disputed === true;
  const refunded = charge?.refunded === true || Number(charge?.amount_refunded || 0) > 0;

  let accessState = 'PENDING';
  if (disputed) accessState = 'REVOKED_DISPUTED';
  else if (refunded) accessState = 'REVOKED_REFUNDED';
  else if (paid && planMonths) accessState = 'ACTIVE';

  const settlementEpoch = Number(charge?.created || paymentIntent?.created || session.created || 0);
  const activatedAt = accessState === 'ACTIVE' && settlementEpoch ? new Date(settlementEpoch * 1000).toISOString() : null;
  const expiresAt = accessState === 'ACTIVE' && settlementEpoch && planMonths ? addUtcMonths(settlementEpoch, planMonths) : null;

  return res.status(200).json({
    schema: '8x8.payment-status.v1',
    canonical_root: 'fabric://8x8/core',
    state: 'PRESENT_PROVEN_PROVIDER_STATUS_READ',
    checkout_session_id: session.id,
    payment_status: session.payment_status || 'unknown',
    payment_intent_status: paymentIntent?.status || 'unknown',
    access_state: accessState,
    plan_months: planMonths,
    amount_total_usd: Number.isFinite(Number(session.amount_total)) ? (Number(session.amount_total) / 100).toFixed(2) : null,
    currency: String(session.currency || '').toUpperCase() || null,
    activated_at: activatedAt,
    expires_at: expiresAt,
    payment_claim_id: typeof metadata.payment_claim_id === 'string' ? metadata.payment_claim_id : null,
    eightx8_id: typeof metadata.eightx8_id === 'string' ? metadata.eightx8_id : null,
    genesis_reservation_state: typeof metadata.genesis_reservation === 'string' ? metadata.genesis_reservation : 'UNKNOWN',
    local_genesis_ledger_recorded: false,
    local_genesis_ledger_note: 'Provider settlement verification is independent of the currently unbound local Genesis reservation database.',
    refunded,
    disputed,
    success_redirect_alone_counted_as_payment: false,
    raw_customer_data_returned: false,
    signing: false,
    mainnet: false,
    mint: false,
    airdrop: false,
    custody: false,
  });
}
