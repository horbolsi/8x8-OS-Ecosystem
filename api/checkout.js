import crypto from 'crypto';

const PLANS = Object.freeze({
  1: 888,
  3: 2664,
  6: 5328,
  9: 7992,
  12: 10656,
});
const ID_RE = /^8x8-[A-Za-z0-9_.:-]{3,120}$/;
const SOURCE_RE = /^[A-Za-z0-9_.:-]{1,40}$/;

function publicBaseUrl(req) {
  const configured = String(process.env.EIGHTX8_PUBLIC_BASE_URL || '').trim();
  if (configured) {
    const u = new URL(configured);
    if (u.protocol !== 'https:' && u.hostname !== 'localhost') throw new Error('INVALID_PUBLIC_BASE_URL');
    return u.origin;
  }

  const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!/^[A-Za-z0-9.-]+(?::\d+)?$/.test(rawHost)) throw new Error('INVALID_HOST');
  const hostname = rawHost.split(':')[0].toLowerCase();
  const allowed = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app');
  if (!allowed) throw new Error('HOST_NOT_ALLOWLISTED');
  return `${hostname === 'localhost' || hostname === '127.0.0.1' ? 'http' : 'https'}://${rawHost}`;
}

function stripeErrorMessage(body, status) {
  const message = body?.error?.message;
  return typeof message === 'string' && message.length < 240 ? message : `STRIPE_HTTP_${status}`;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-8X8-Canonical-Root', 'fabric://8x8/core');
  res.setHeader('X-8X8-Payment-Authority', 'STRIPE_HOSTED_CHECKOUT_ONLY');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const stripeSecret = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!stripeSecret) {
    return res.status(503).json({
      state: 'BLOCKED_STRIPE_SECRET_NOT_CONFIGURED',
      credential_value_returned: false,
      financial_effect: false,
    });
  }

  const planMonths = Number(req.body?.planMonths);
  const unitAmount = PLANS[planMonths];
  if (!unitAmount) return res.status(422).json({ error: 'INVALID_PLAN_MONTHS' });

  const rawEightx8Id = String(req.body?.eightx8Id || '').trim();
  if (rawEightx8Id && !ID_RE.test(rawEightx8Id)) {
    return res.status(422).json({ error: 'INVALID_8X8_ID' });
  }
  const sourceSurfaceRaw = String(req.body?.sourceSurface || 'browser').trim();
  const sourceSurface = SOURCE_RE.test(sourceSurfaceRaw) ? sourceSurfaceRaw : 'browser';
  const paymentClaimId = crypto.randomUUID();

  let baseUrl;
  try {
    baseUrl = publicBaseUrl(req);
  } catch (error) {
    return res.status(400).json({ error: String(error?.message || 'INVALID_PUBLIC_BASE_URL') });
  }

  const metadata = {
    canonical_root: 'fabric://8x8/core',
    plan_months: String(planMonths),
    payment_claim_id: paymentClaimId,
    source_surface: sourceSurface,
    access_entitlement: 'FIXED_DURATION_DIGITAL_ACCESS',
    asset_delivery: 'NONE_GATED',
    genesis_reservation: rawEightx8Id ? 'IDENTITY_SUPPLIED_LEDGER_VERIFICATION_PENDING' : 'IDENTITY_LINK_REQUIRED',
  };
  if (rawEightx8Id) metadata.eightx8_id = rawEightx8Id;

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${baseUrl}/one-fabric?payment=cancelled#access`);
  form.set('client_reference_id', rawEightx8Id || paymentClaimId);
  form.set('customer_creation', 'always');
  form.set('billing_address_collection', 'auto');
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(unitAmount));
  form.set('line_items[0][price_data][product_data][name]', `8x8 Access — ${planMonths} month${planMonths === 1 ? '' : 's'}`);
  form.set('line_items[0][price_data][product_data][description]', 'Fixed-duration digital access to the 8x8 user product. No minting, custody, signing, or blockchain asset delivery occurs in checkout.');
  form.set('payment_intent_data[description]', `8x8 digital access — ${planMonths} month${planMonths === 1 ? '' : 's'}`);
  Object.entries(metadata).forEach(([key, value]) => {
    form.set(`metadata[${key}]`, value);
    form.set(`payment_intent_data[metadata][${key}]`, value);
  });

  const clientIdempotency = String(req.headers['idempotency-key'] || '').trim();
  const idempotencyKey = /^[A-Za-z0-9_.:-]{16,200}$/.test(clientIdempotency)
    ? `8x8-client-${clientIdempotency}`
    : `8x8-checkout-${paymentClaimId}`;

  let stripeResponse;
  let stripeBody;
  try {
    stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': idempotencyKey,
      },
      body: form,
      cache: 'no-store',
    });
    stripeBody = await stripeResponse.json();
  } catch (error) {
    console.error('[8x8-checkout] Stripe request failed', error?.name || 'FETCH_ERROR');
    return res.status(502).json({ state: 'CHECKOUT_PROVIDER_UNREACHABLE', error: 'PAYMENT_PROVIDER_UNREACHABLE' });
  }

  if (!stripeResponse.ok || !stripeBody?.id || !stripeBody?.url) {
    console.error('[8x8-checkout] Stripe rejected checkout request', stripeResponse.status);
    return res.status(502).json({
      state: 'CHECKOUT_PROVIDER_REJECTED',
      error: stripeErrorMessage(stripeBody, stripeResponse.status),
      credential_value_returned: false,
    });
  }

  return res.status(200).json({
    schema: '8x8.checkout-session.v1',
    state: 'HOSTED_CHECKOUT_CREATED',
    checkout_provider: 'Stripe Checkout',
    checkout_url: stripeBody.url,
    session_id: stripeBody.id,
    payment_claim_id: paymentClaimId,
    plan_months: planMonths,
    principal_usd: (unitAmount / 100).toFixed(2),
    eightx8_id_link_state: rawEightx8Id ? 'SUPPLIED_NOT_VERIFIED_BY_CHECKOUT' : 'IDENTITY_LINK_REQUIRED',
    financial_effect_on_creation: false,
    financial_effect_if_customer_completes_checkout: true,
    signing: false,
    mainnet: false,
    mint: false,
    airdrop: false,
    custody: false,
  });
}
