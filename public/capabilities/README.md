# MSG232 External Capabilities Observatory V2

`/capabilities/` is a static protected-beta projection of canonical MSG197 Ledger V4 in `8x8org/8x8-user-edition`.

## Included

- thirteen immutable candidate identities and upstream pins;
- candidate decisions and runtime boundaries;
- one measured Supervision canary;
- one merged, disabled-by-default Supervision adapter contract;
- measured benchmark, adapter-contract, installed-candidate and council-vote counts;
- explicit PDF Inspector, AirLLM and council blockers;
- canonical source commit, ledger blob and upstream pin-set SHA-256;
- accessible filtering and fail-closed rendering.

## Supervision truth boundary

The adapter contract is evidence and schema only. It remains:

- `enabled=false`
- `install_state=NOT_INSTALLED`
- `runtime_authority=NONE`
- `production_ready=false`

The route cannot execute the adapter or install its upstream package.

## Excluded

- third-party package installation;
- phone, Ubuntu PRoot or production runtime changes;
- private data, credentials, wallets or model files;
- service, scheduler or database control;
- external scripts, APIs, analytics or persistence;
- public claims that MSG197 or the whole 8x8 system is complete.

## Score boundary

The route may reach `100/100` only after exact-head tests, CodeQL, READY protected deployment, HTTP 200 route verification, exact content binding and rollback evidence. The score applies only to this static route.

## Rollback

The previous V3 protected projection is commit `6b7e5bf8fb13587a2e26f4949ae774a41571cc5f` on `integration/public-8x8-v1`. Close or revert the scoped release PR to restore it. No production alias change is authorized.
