# MSG231 External Capabilities Observatory

`/capabilities/` is a static protected-beta projection of the canonical MSG197 ledger in `8x8org/8x8-user-edition`.

## Included

- thirteen immutable candidate identities and source pins;
- candidate decisions and runtime boundaries;
- measured benchmark, installed-candidate and council-vote counts;
- explicit PDF Inspector, AirLLM and council blockers;
- canonical source commit, ledger blob and upstream pin-set SHA-256;
- accessible filtering and fail-closed rendering.

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

The pre-release baseline is `integration/public-8x8-v1` at `767f6a0d49f390dab71ec403be381699603bbcce`. Close or revert the release PR to restore that state. No production alias change is authorized.
