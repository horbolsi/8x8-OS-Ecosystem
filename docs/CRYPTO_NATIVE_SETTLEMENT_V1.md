# ©️8x8 Crypto-Native Settlement V1

Canonical root: `fabric://8x8/core`

## Goal

Provide a non-custodial, direct-crypto settlement architecture for 8x8 memberships and NFT Vault reservations without requiring Stripe, Google billing, or another card processor as a payment rail.

## Authority and truth

This implementation is **SOURCE_ONLY / FUTURE_GATED** for value effects. It deliberately refuses payment requests until receiving addresses, conversion/oracle policy, confirmation thresholds, settlement verification, entitlement persistence, and security review are all present and verified.

The intended authority sequence is:

`AUTHENTICATED → GRANTED → QUOTE_CREATED → CHAIN_TX_OBSERVED → SETTLEMENT_VERIFIED → ENTITLEMENT_GRANTED → NFT_VAULT_RESERVATION_BOUND`

A browser, agent, or public API never receives wallet seeds or private keys. The server does not sign or move user funds.

## Economic policy

- Membership reference: **$8.88**
- Current 8x8 economic policy reference: **4.44%**
- Ordinary companion-token P2P transfer tax: **0%**
- No live payment, mint, mainnet write, airdrop, funded liquidity, or owner-fund movement is activated by this branch.

## Payment model

Users may eventually pay directly on a supported network from their own wallet to a published 8x8 receiving address. The platform should then observe the transaction using a read-only chain adapter, wait for the configured confirmation/finality threshold, verify amount/network/destination, and only then issue a tenant-scoped entitlement receipt.

The platform never treats a submitted transaction hash as settlement proof by itself.

## Required activation gates

1. Exact receiving address per supported network, stored through the Vault/credential-broker boundary where appropriate.
2. Network-specific confirmation/finality policy.
3. Trusted quote source and timestamped conversion receipt if a USD reference price is converted into native assets.
4. Read-only chain observer with destination/amount/finality verification.
5. Replay/idempotency protection so one transaction cannot create multiple entitlements.
6. Durable entitlement store bound to the authenticated 8x8 ID.
7. NFT Vault reservation uniqueness rule and backing invariant.
8. Failure/refund/cancellation policy.
9. Public disclosure of network fees and quote expiry.
10. Security and legal review before `sale_open=true`.

## API

`GET /api/crypto-native-settlement` exposes only public readiness metadata.

`POST /api/crypto-native-settlement` validates the requested network and returns a **409 FUTURE_GATED** payment intent. It never emits a receiving address or asks a user to transfer funds until the activation gates are proven.

## Rollback

Delete this branch or revert its commits. No value effect, credentials, or runtime authority are created by these source files.
