const PLANS = Object.freeze({
  1: 888,
  3: 2664,
  6: 5328,
  9: 7992,
  12: 10656,
});

const DATABASE_ENV_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'NEON_DATABASE_URL',
];

function configured(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-8X8-Canonical-Root', 'fabric://8x8/core');
  res.setHeader('X-8X8-Payment-Authority', 'STRIPE_HOSTED_CHECKOUT_ONLY');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const stripeReady = configured('STRIPE_SECRET_KEY');
  const webhookReady = configured('STRIPE_WEBHOOK_SECRET');
  const databaseBindingName = DATABASE_ENV_CANDIDATES.find(configured) || null;

  return res.status(stripeReady ? 200 : 503).json({
    schema: '8x8.payment-health.v1',
    canonical_root: 'fabric://8x8/core',
    state: stripeReady ? 'READY_FOR_HOSTED_CHECKOUT' : 'BLOCKED_STRIPE_SECRET_NOT_CONFIGURED',
    stripe_secret_key_configured: stripeReady,
    stripe_webhook_secret_configured: webhookReady,
    database_binding_configured: Boolean(databaseBindingName),
    database_binding_name: databaseBindingName,
    checkout_mode: 'ONE_TIME_FIXED_DURATION_DIGITAL_ACCESS',
    currency: 'USD',
    plans: Object.entries(PLANS).map(([months, cents]) => ({
      months: Number(months),
      principal_usd: (cents / 100).toFixed(2),
    })),
    access_policy: {
      free_daily_minutes: 88,
      verified_settlement_required: true,
      success_redirect_is_payment_proof: false,
      genesis_reservation: databaseBindingName ? 'LEDGER_BINDING_PRESENT_SEPARATE_VERIFICATION_REQUIRED' : 'LOCAL_LEDGER_BINDING_BLOCKED',
      mint: false,
      airdrop: false,
      signing: false,
      custody: false,
      mainnet_asset_delivery: false,
    },
    credential_values_returned: false,
  });
}
