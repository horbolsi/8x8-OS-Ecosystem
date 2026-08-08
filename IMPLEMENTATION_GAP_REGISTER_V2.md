# 8x8 Implementation Gap Register V2

Reconciled: 2026-08-05
Purpose: convert recovered architecture into verifiable implementation work without breaking existing runtime or public-safe workflows.

## Critical gates

| Domain | Current evidence | Gap | Required proof |
|---|---|---|---|
| Termux/Ubuntu runtime | Historical service, database, agent and receipt evidence | No fresh direct census in this chat | Signed current inventory, service states, git heads, storage, queues, leases and receipt hashes |
| Agent presence | Canonical identities and presence contract exist | Current authenticated heartbeats unavailable | Identity registry, nonce validation, provider attestation and task receipts |
| Replit | Existing app and upgrade request are known | Post-upgrade compatibility and security unverified | Read-only code/behavior audit, tests, secrets review, simulation labels and deployment state |
| Databases | Multiple SQLite/Postgres paths documented | Canonical source conflicts and schema freshness unresolved | Read-only schema census, migration map, row-count metadata, ownership and backup/rollback receipts |
| Cloud deployments | Vercel preview checks exist; Render/Neon referenced | Production SHAs, domains, logs and tenant isolation not fully reconciled | Deployment-to-commit binding, environment inventory, logs, rollback and secret rotation evidence |
| Public release | Documentation branch is mergeable | Runtime demo, public tests and claim validation incomplete | Reproducible demo, CI, security scans, compatibility matrix and sanitized receipts |

## Repository reconciliation

1. Audit every private repository using file-tree manifests and recent commit history.
2. Classify each path as canonical, active implementation, historical snapshot, backup, generated artifact, private evidence or deprecated duplicate.
3. Reconcile identical Web3 README identities in `8x8-os-hub` and `8x8-OS-unified` with their actual roles.
4. Create a non-destructive archive/deprecation policy for duplicate snapshots.
5. Link every public claim to a source repository, commit and maturity label.

## Runtime and control fabric

1. Fresh service census across Termux and Ubuntu PRoot.
2. Resolve runtime entry-version drift.
3. Record active missions, pending missions, failures, blocked work and queue ownership.
4. Verify lease expiry, owner gates and emergency stop.
5. Verify bounded recovery and restart-loop protection.
6. Publish sanitized current-state receipts.

## Identity and council

1. Materialize canonical identity records for all twelve recovered roles.
2. Separate designed identities from authenticated live agents.
3. Implement visible OFFLINE/CONNECTING/BLOCKED states.
4. Enforce silence-is-not-a-vote and quorum exclusion rules.
5. Preserve dissent and attribution in council decisions.

## Memory, messages and provenance

1. Reconcile event ledger, deterministic projection, semantic memory and message envelopes.
2. Resolve conflicting database paths without guessing.
3. Implement digest chaining and rollback verification where still design-only.
4. Add retention, redaction and encrypted-blob policies.
5. Build bounded startup retrieval with source citations and contradiction visibility.

## Cockpit and interfaces

1. Define one canonical Cockpit API and event schema.
2. Adapt existing surfaces instead of replacing them blindly.
3. Keep 2D as primary reliable interface.
4. Bind 3D/360 objects only to canonical real state.
5. Add truth freshness, owner decision, incident, gate and rollback panels.
6. Preserve low-power and accessible modes.

## Studio

1. Implement a canonical artifact registry.
2. Assign creation IDs, provenance, privacy/copyright classes and owner states.
3. Separate generation, review, approval, publishing and analytics.
4. Connect private historical Studio packages without exposing private assets.
5. Add fact-check, quality and release receipts.

## Research, OSINT and markets

1. Bind research outputs to sources, artifacts and memory records.
2. Integrate OSINT surfaces as connectors rather than isolated islands.
3. Keep trading dashboards read-only and agents signal-only.
4. Separate market analysis from transaction authority.
5. Add stale-data and provider-failure handling.

## Blockchain laboratory

1. Pass independent CI on existing test contract sources.
2. Provision exact allowlisted testnet addresses outside Git.
3. Generate chain-specific deployment packets.
4. Deploy only separately approved testnet slices.
5. Record explorer links, bytecode/source hashes and security tests.
6. Keep mainnet, private keys, arbitrary signing and monetary promotion blocked.

## Connectors and synchronization

1. Reconcile the Airtable canonical connector table with legacy duplicate rows.
2. Attach stable IDs, authority, data class, freshness and next gate to each connector.
3. Bind Drive, Notion, ClickUp and Canva artifacts to canonical GitHub or runtime evidence.
4. Leave empty connectors unused until a real role exists.
5. Never infer production approval from authentication or configuration alone.

## Backward compatibility

No existing workflow is retired until:

1. its current behavior is inventoried;
2. the replacement is tested beside it;
3. data and API compatibility are proven;
4. rollback is available;
5. owner approval explicitly retires the old path.

## Completion rule

A domain may be marked complete only when implementation, tests, deployment state, evidence freshness, security review, compatibility and rollback all pass for the declared scope. Completion of one release unit does not imply completion of the whole 8x8 ecosystem.