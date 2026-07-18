# Security Policy

This repository is a public-safe companion, not a private runtime or production control plane.

## Prohibited public content

Do not commit:

- API keys, bot tokens, cookies, passwords, JWTs, private keys, seeds, or wallet material;
- administrator fallbacks or owner-claim credentials;
- production database URLs;
- personal messages, private memory, balances, or device exports;
- endpoints that claim sensitive actions succeeded when no transaction occurred.

## Public behavior

The public server may expose health, architecture, fixture agents, closed gates, deterministic planning, and audit receipts.

Financial, wallet, publishing, messaging, credential, production, destructive, and permission-escalation routes must return `403 PUBLIC_DEMO_GATED` and perform no external side effect.

## Historical exposure

Earlier history contained administrator values and unsafe owner-shaped or financial-success responses. Treat any matching value as compromised and rotate it in every external deployment. Branch remediation does not erase history or revoke credentials.

## Canonical implementation

Current hackathon security and judge work belongs in https://github.com/horbolsi/8x8.
