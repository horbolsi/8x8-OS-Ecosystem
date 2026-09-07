import crypto from 'node:crypto';

const POLICY = {
  referenceUsd: '8.88',
  taxPolicyPercent: '4.44',
  ordinaryP2PTaxPercent: '0',
  networks: ['BTC','ETH','BNB','SOL','TON','PI']
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

function normalizeNetwork(v='') {
  const n = String(v).trim().toUpperCase();
  return POLICY.networks.includes(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      service: '8x8-crypto-native-settlement',
      canonicalRoot: 'fabric://8x8/core',
      architecture: 'PRESENT_PROVEN_SOURCE_ONLY',
      paymentAcceptance: 'FUTURE_GATED',
      settlement: 'FUTURE_GATED',
      saleOpen: false,
      walletSigning: false,
      custody: false,
      mainnetWriteFromServer: false,
      tokenMint: false,
      processorDependency: 'none-required',
      referenceUsd: POLICY.referenceUsd,
      taxPolicyPercent: POLICY.taxPolicyPercent,
      ordinaryCompanionP2PTaxPercent: POLICY.ordinaryP2PTaxPercent,
      networks: POLICY.networks.map(network => ({
        network,
        enabled: false,
        receivingAddressConfigured: false,
        confirmationPolicyConfigured: false
      })),
      authorityChain: [
        'AUTHENTICATED',
        'GRANTED',
        'QUOTE_CREATED',
        'CHAIN_TX_OBSERVED',
        'SETTLEMENT_VERIFIED',
        'ENTITLEMENT_GRANTED'
      ]
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('allow', 'GET, POST');
    return json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, {error:'INVALID_JSON'}); }
  }
  body = body || {};

  const network = normalizeNetwork(body.network);
  if (!network) return json(res, 400, { error: 'UNSUPPORTED_NETWORK' });

  const intent = {
    intentId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    network,
    membershipTier: String(body.membershipTier || 'Genesis Membership').slice(0, 64),
    referenceUsd: POLICY.referenceUsd,
    state: 'FUTURE_GATED',
    paymentAddress: null,
    amountNative: null,
    expiresAt: null,
    settlementVerification: 'NOT_CONFIGURED',
    entitlement: 'NOT_GRANTED',
    nftVaultReservation: 'NOT_BOUND',
    instructions: 'No payment should be sent until a receiving address, quote conversion source, confirmation threshold, and settlement verifier are PRESENT_PROVEN.'
  };

  return json(res, 409, {
    error: 'PAYMENT_RAIL_NOT_ACTIVATED',
    intent,
    safety: {
      paymentAttempted: false,
      signingRequested: false,
      fundsMoved: false,
      mintRequested: false
    }
  });
}
