# EVIDENCE_LEDGER

## Freshness / Reality Labels

- **live:** currently verified in active runtime.
- **recent:** recently verified but requires refresh before deployment claims.
- **historical:** previously verified evidence not valid for current-state claims.
- **implemented:** code exists; runtime proof still required.
- **experimental:** prototype behavior, not production-approved.
- **simulated:** intentionally non-live behavior.
- **designed:** specified but not implemented.
- **blocked:** cannot be verified until prerequisites are resolved.

## Canonical Evidence Classes

| Class | Status | Freshness | Notes |
|---|---|---|---|
| Operator Fabric | in review | historical | historical receipts exist; refresh probes required |
| Presence Fabric | in review | recent | bridge work surfaced; fresh runtime probes required |
| Council Orchestration | in review | implemented | orchestration work surfaced; needs current execution receipts |
| Per-Identity Execution | in review | implemented | auth remediation surfaced; pending fresh verification |
| Receipt Chain | in review | historical | local control-fabric receipts found; not current-state proof |
| Lease System | in review | designed | lifecycle boundaries documented; runtime verification pending |
| Continuity Plane | in review | designed | continuity specification tracked; implementation verification pending |
| Public/Private Split | in review | recent | privacy-boundary work surfaced; needs current probe evidence |
| Artboard/Visual Council | in review | experimental | preview/spec work present; not treated as production behavior |
| Unified Presence Canary | in review | designed | canary specification surfaced; implementation/probe pending |

## Current Verification Constraint

Fresh Termux and Ubuntu probes are required before any current-state deployment claim.

## CI Snapshot (Recent)

- Recent failed run captured in GitHub Actions (`MSG229 Visual Council Registry`, run `31057793852`): `test/visual-council-smoke.mjs` failed with `unexpected authorship: 8X8-VIS-0001`.
- CI must be green on the exact release commit before release-gate completion.
