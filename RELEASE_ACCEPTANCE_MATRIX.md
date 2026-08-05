# 8x8 Release Acceptance Matrix

No release is called complete, continuous, autonomous, production-ready, or 100/100 unless every applicable gate below has current evidence.

| Gate | Required evidence | Current state |
|---|---|---|
| Canonical identity | Reviewed public definition and repository map | Implemented on review branch |
| Documentation consistency | Cross-repository links and maturity labels | Partial |
| Build and preview | Successful build tied to exact commit SHA | Vercel preview passed for current review head |
| Automated review | Review check tied to exact commit SHA | CodeRabbit passed for current review head |
| Unit and integration tests | Reproducible test logs and artifacts | Not fully verified |
| Secret safety | Secret scan, credential review, no hardcoded fallbacks | Not fully verified |
| Dependency safety | Lockfile audit, vulnerability review, update policy | Not fully verified |
| Runtime freshness | Signed current census from each active runtime node | Blocked in this chat |
| Agent identity | Current identity, authority, activation, and heartbeat records | Not live-verified |
| Mission control | Queue, lease, receipt, rollback, and emergency-stop evidence | Historical only |
| Database integrity | Schema, migrations, backups, restore test, tenant isolation | Not fully verified |
| Connector reconciliation | One canonical row per connector, read/write status, release linkage | Canonical registry created; reconciliation ongoing |
| Replit readiness | Code, tests, simulations, secrets, database, deployment inspected | Upgrade requested; result not fully verified |
| Cloud deployment | Vercel/Render release SHA, logs, domains, rollback | Vercel preview verified; production surfaces incomplete |
| Public/private isolation | No private control, memory, secrets, wallets, or shell exposure | Designed; full validation pending |
| Threat model | Assets, actors, abuse cases, controls, residual risks | Pending |
| Reproducible demo | Public-safe end-to-end workflow with expected output | Pending |
| Observability | Health, logs, alerts, heartbeat, resource pressure, recovery | Historical/partial |
| Recovery | Tested restart, rollback, backup restore, and degraded mode | Not fully verified |
| Legal and licensing | License review, third-party notices, privacy and terms | Pending |
| Independent acceptance | Reviewer not responsible for implementation signs evidence package | Pending |

## Publication classes

- **PREVIEW:** public-safe documentation or preview build; no production claim.
- **BETA:** bounded users, explicit limitations, monitoring, rollback, and current tests.
- **PRODUCTION:** all applicable critical gates pass and exact release SHA is receipted.
- **CONTINUOUS:** production plus current supervisor, heartbeat, recovery, and resource evidence.
- **AUTONOMOUS:** continuous plus explicit authority scope, lease expiry, approvals, emergency stop, and audit receipts.

## Absolute prohibitions

The following must never be inferred from a green preview check alone:

- guaranteed 24/7 operation
- perfect security
- unrestricted autonomous authority
- live trading permission
- medical or regulatory compliance
- permanent synchronization across connectors
- quantum or beyond-quantum capability

## Release decision

The current canonical public package is suitable for review and preview. It is not yet evidence-complete for a production, continuous-autonomy, or 100/100 declaration.
