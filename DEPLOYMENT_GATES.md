# Deployment Gates

No public deployment may be described as complete until these gates pass with evidence.

## Gate 0 — secret and data containment

- Remove all hardcoded administrator secrets and owner identifiers.
- Disable development authentication outside explicitly local development.
- Quarantine private phone imports, credentials, memories, trading data, and historical conversations.
- Run secret scanning across repository history and active worktrees.

## Gate 1 — execution safety

- Remove or isolate unrestricted shell execution routes.
- Apply allowlisted commands, per-action authorization, timeouts, output limits, and immutable audit receipts.
- Require explicit owner approval for high-impact operations.
- Verify emergency stop and authority revocation.

## Gate 2 — service integrity

- Replace synthetic health responses with dependency-aware checks.
- Add structured logging, crash handling, rate limiting, CORS policy, and external alerting.
- Verify database, relay, bot, model provider, and filesystem failure behavior.

## Gate 3 — durable data

- Add reviewed database migrations.
- Remove restart-lost production data paths.
- Back up and restore the durable stores in a clean environment.
- Prove data ownership, retention, and deletion rules.

## Gate 4 — product truth

- Mark simulations and fixtures visibly.
- Prevent fake transaction hashes, fake balances, placeholder payments, and mock governance from appearing as completed real operations.
- Connect frontend actions only to verified backend or on-chain implementations.

## Gate 5 — reproducible delivery

- Provide a clean installation path.
- Add CI, unit tests, integration tests, security checks, and smoke tests.
- Publish checksums, release notes, compatibility data, and sanitized execution evidence.

## Gate 6 — public deployment

- Deploy only after Gates 0–5 pass.
- Verify the production URL, TLS, environment isolation, rollback, monitoring, and logged-out behavior.
- Record the exact commit, build digest, configuration fingerprint, and deployment receipt.

A running preview is not equivalent to a production deployment. A successful interface render is not proof that its advertised backend, agent, payment, trading, blockchain, or recovery behavior exists.
