# Connector Authority Matrix

This document records the connected-workspace authority model discovered during the 2026-08-05 reconciliation pass. It is not a secrets inventory and does not grant new permissions.

## Canonical authority order

1. Live runtime truth: deployed commit, heartbeat, services, missions, gates and receipts.
2. GitHub: canonical code, schemas, reviewed branches, releases, CI and public-safe evidence.
3. Private message vault: redacted evidence envelopes and session manifests.
4. Curated memory: reviewed semantic and procedural memory.
5. Google Drive: restricted continuity handoffs, architecture reports and judge artifacts.
6. Notion: human-readable navigation, decisions, contradictions and recovery index.
7. Airtable: structured connector, workstream and activation-gate metadata.
8. Communications: correspondence and alerts, never implementation truth by themselves.

## Verified connected sources

| Source | Intended role | Authority class | Current finding |
|---|---|---|---|
| GitHub | Code, PRs, CI, releases, evidence | Canonical | Connected; branch-scoped writes available |
| Samsung Termux + Ubuntu | Private runtime and receipts | Runtime canonical | Historical evidence only in this chat; no live shell connector |
| Google Drive | Continuity and restricted reports | Mirror | Connected; substantial 8x8 evidence found |
| Notion | Knowledge map and recovery index | Mirror | Connected; Connector Control Plane and Recovery Program found |
| Airtable | Connector/workstream/gate registry | Mirror | Connected; 3-table registry found |
| Replit | Interactive app/runtime surface | Owner-gated implementation | Connected; deep audit and security upgrade initiated |
| Gmail | Mailbox evidence and owner-approved communications | Owner-gated | Registry says active; not audited in this pass |
| Neon | Postgres and beta authentication data | Owner-gated storage | Registry says active; live schema not audited in this pass |
| Vercel | Public edge and bounded proxy | Owner-gated deployment | Registry says active; production release not independently verified here |
| Render | Durable API/worker target | Owner-gated deployment | Blueprint/foundation only until exact release and credentials are verified |
| Telegram | Private/public communication adapters | Owner-gated | Foundation; identities and tokens must remain separate |
| Discord | Private/public community adapters | Owner-gated | Foundation; broad messaging remains gated |
| Slack | Coordination and alerts | Bounded communication | Public search found no 8x8 material; private search not performed |
| Dropbox | Optional encrypted archive | Non-canonical | No matching 8x8 artifacts found |
| Box | Optional encrypted archive | Non-canonical | Returned unrelated legacy material |
| Asana | Human operational checklists | Non-canonical planning | No matching 8x8 project found |

## Airtable registry defects found

The `8x8 OS Connector Registry` contains duplicate rows for multiple connectors, including GitHub, Replit, Render, Vercel, Notion, Airtable, Telegram, Discord, Gmail, Google Drive, Neon and Samsung Termux/Ubuntu.

Required remediation:

- Establish one stable connector ID per system.
- Merge duplicate metadata without losing provenance.
- Add a uniqueness rule or duplicate-detection view.
- Refresh `Last Verified` from live probes rather than copying planning dates.
- Separate `configured`, `connected`, `authenticated`, `read-tested`, `write-tested`, and `production-approved` states.
- Record exact environment, account/workspace, permission scope and evidence receipt.
- Never infer current runtime health from an Airtable status label.

## Connector state vocabulary

Every connector should use the following state progression:

1. DISCOVERED
2. CONFIGURED
3. AUTHENTICATED
4. READ_VERIFIED
5. WRITE_VERIFIED_BOUNDED
6. RELEASE_LINKED
7. PRODUCTION_APPROVED
8. SUSPENDED or REVOKED

A connector may not skip directly from CONFIGURED to PRODUCTION_APPROVED.

## Safety boundaries

- No connector becomes an independent high-risk mutation authority.
- Financial, wallet, publishing, messaging, credentials, destructive operations, production deployment and permission escalation remain separately approved.
- Mirrors may improve navigation but may not overwrite runtime or GitHub truth.
- Historical evidence must carry its observation date and environment.
- Unknown state remains UNKNOWN; simulation remains SIMULATED.
- Private runtime, memories, credentials and raw logs must never be projected into public repositories or public product surfaces.
