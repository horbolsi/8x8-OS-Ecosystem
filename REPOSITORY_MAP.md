# 8x8 Repository Map

This map covers repositories visible through the connected GitHub account on 2026-08-05. Visibility and repository names are evidence; detailed implementation claims require direct code audits.

| Repository | Visibility | Proposed canonical role | Current confidence | Required action |
|---|---|---|---|---|
| `horbolsi/8x8-OS-Ecosystem` | Public | Canonical public front door and public-safe demonstrations | High | Complete security reconciliation, reproducible demo, CI, evidence package, and merge review |
| `horbolsi/8x8-os-a-z` | Public | Educational and architectural companion | High | Audit every document and generated format; align maturity labels and cross-links |
| `horbolsi/8x8` | Private | Legacy or canonical implementation candidate; currently quarantined pending reconciliation | Low | Direct clone audit, secret scan, history review, branch/PR reconciliation, and canonical-status decision |
| `horbolsi/8x8-blockchain` | Private | Blockchain, contract, token, wallet, and Web3 implementation work | Medium | Contract inventory, chain/deployment verification, tests, threat review, and public-safe extraction |
| `horbolsi/8x8-memory` | Private | Persistent memory, knowledge, continuity, and retrieval work | Medium | Data classification, schema audit, retention rules, retrieval verification, and privacy review |
| `horbolsi/8x8-messages` | Private | Mission, agent, owner, and inter-node message history or protocols | Medium | Protocol/schema audit, PII and secret review, retention rules, and sanitization plan |
| `horbolsi/8x8-os-backup` | Private | Backup or historical snapshot | Medium | Freeze writes, verify recoverability, establish retention, and prevent use as a live canonical source |
| `horbolsi/8x8-os-hub` | Private | Hub/control-plane implementation or historical app | Medium | Compare against Replit app and canonical runtime; eliminate duplicate authority paths |
| `horbolsi/8x8-os-june2026` | Private | Time-stamped historical snapshot | High | Treat as archive; extract missing features only through reviewed migration |
| `horbolsi/8x8-os-private` | Private | Sensitive implementation and owner-plane material | Medium | Secret scan, access-control review, data classification, and strict no-publication boundary |
| `horbolsi/8x8-OS-unified` | Private | Unification experiment or integration candidate | Medium | Compare architecture and code lineage; decide merge, archive, or extraction status |
| `horbolsi/flash-hermes-sync-safe` | Private | Sanitized synchronization mirror, architecture references, profiles, skills, and continuity documentation | High | Preserve as evidence input; validate freshness and prevent it from becoming an accidental runtime source |

## Repository classes

### Canonical public

A repository that new users, contributors, judges, and customers may trust as the official public entry point.

### Canonical private

A repository approved as a live source of truth for private implementation. No repository currently receives this label from visibility or naming alone.

### Runtime

Code or state directly involved in executing services, agents, missions, communications, or control-plane actions.

### Evidence mirror

Sanitized records, architecture references, receipts, manifests, and summaries used to prove or explain system behavior without exposing live secrets or private state.

### Experimental

Real implementation work that is not yet a stable source of truth.

### Archive

Historical snapshots retained for recovery, comparison, and feature extraction. Archives must not silently accept live writes.

### Quarantined

Repositories that may contain secrets, unsafe history, contradictory architecture, imported data, or unverified code. Quarantine means read-only audit before reuse.

## Canonicalization rules

1. Repository names do not establish authority.
2. The newest commit is not automatically the best implementation.
3. Historical snapshots must never overwrite current validated work.
4. Private state cannot be copied into public repositories without a secret and privacy review.
5. Duplicate features require lineage comparison and one explicit source-of-truth decision.
6. Public repositories must link to each other and explain what remains private.
7. Every repository must eventually contain a short role declaration stating its class, authority, supported use, and deprecation status.

## Missing visibility

The connected GitHub account reports no organization memberships. Repositories under a separate organization or an uninstalled GitHub App context are outside this live inventory and require a separate verified connection.