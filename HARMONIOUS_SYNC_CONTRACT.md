# 8x8 Harmonious Synchronization Contract

## Purpose

This contract defines how 8x8 data, claims, plans, runtime state, public documentation and connector mirrors must reconcile without creating competing truths.

## Authority order

1. Fresh runtime receipts, deployment SHA, service health, mission state and activation gates.
2. GitHub reviewed code, schemas, pull requests, CI results, releases and sanitized evidence.
3. Private message vault and curated memory records linked by stable IDs and hashes.
4. Google Drive continuity and human-review mirrors.
5. Notion architecture, decisions and recovery navigation.
6. Airtable structured connector, workstream and activation-gate registry.
7. ClickUp and other planning mirrors.
8. Design and communication surfaces such as Canva and Slack.

Lower-ranked systems may mirror or plan. They may not override higher-ranked evidence.

## Canonical identity

Every system object must have, where applicable:

- stable object ID
- source connector key
- canonical repository or runtime reference
- content or state hash
- created and last-verified timestamps
- truth classification
- owner or responsible identity
- risk class
- public/private classification
- activation gate
- rollback or revocation path

## Truth classes

- LIVE VERIFIED
- RECENT VERIFIED
- HISTORICAL VERIFIED
- IMPLEMENTED NOT LIVE-VERIFIED
- EXPERIMENTAL
- SIMULATED
- DESIGNED
- BLOCKED
- UNKNOWN
- CONTRADICTED
- REJECTED

No claim may be promoted to a stronger class without new evidence.

## Connector lifecycle

DISCOVERED → CONFIGURED → AUTHENTICATED → READ VERIFIED → WRITE VERIFIED BOUNDED → RELEASE LINKED → PRODUCTION APPROVED

A connector may stop at any stage. Configuration alone never proves synchronization or production readiness.

## Synchronization envelope

A cross-system update should carry:

- operation ID
- source and target connector keys
- canonical object ID
- source version or SHA
- payload digest
- requested action
- authority identity
- approval gate reference
- execution timestamp
- result status
- target version or receipt
- rollback reference

## Conflict resolution

1. Prefer fresher evidence only when identity and provenance match.
2. Prefer runtime evidence over planning records.
3. Prefer reviewed GitHub state over free-form mirrors.
4. Preserve contradictions instead of silently overwriting them.
5. Quarantine records with missing identity, digest or authority.
6. Require owner approval for production, publishing, treasury, credentials, destructive operations and unrestricted private-data access.

## Public release boundary

Public artifacts may include sanitized architecture, capability maturity, demos, tests, receipts and roadmaps. They must exclude credentials, wallet secrets, unrestricted private messages, raw sensitive logs, hidden reasoning, owner-only control paths and unreviewed personal data.

## Completion rule

A lane is complete only when its defined acceptance tests pass and its evidence is linked. “100/100” means complete coverage of an explicit scorecard at a recorded point in time. It never means infinite capacity, permanent uptime or universal access.

## Current implementation

- GitHub public-alignment branch contains the canonical architecture and evidence package.
- Notion contains the Connector Control Plane and Canonical Recovery Program.
- Airtable now contains `Canonical Connector State V1`, a non-destructive deduplicated connector census.
- Existing duplicate Airtable connector rows remain preserved pending explicit review and cleanup authorization.
- Termux, Ubuntu PRoot and Android storage require a fresh signed local census before their current state can be promoted from historical evidence.
