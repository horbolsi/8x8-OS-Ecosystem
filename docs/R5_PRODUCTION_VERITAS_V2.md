# R5 Production Veritas V2

©️8x8 by FlashTM8 ⚡️🌎🤖

Canonical root: `fabric://8x8/core`

## Problem closed by this release unit

A Vercel build can be `READY` while the canonical public production domain still serves an older release. Preview success is therefore insufficient evidence of production promotion.

The durable acceptance contract is now:

`SOURCE → EXACT CARRIER BLOB → PRODUCTION DEPLOYMENT → CANONICAL DOMAIN → HEADER + BODY + RELEASE-ENDPOINT READBACK → ROLLBACK READBACK → VERIFIED`

## Required production proof

The release is not accepted as production until all of the following agree on the canonical public domain:

1. exact deployed SHA;
2. root body markers;
3. `X-8X8-Release-Identity` header;
4. `/_8x8/release` JSON identity;
5. exact carrier Git blob SHA;
6. `/r4` rollback body markers;
7. `/r3` rollback body markers;
8. non-auth-gated HTTP readback.

`READY != PRODUCTION_VERIFIED`

`PREVIEW != PRODUCTION`

`CACHE_HIT != RELEASE_IDENTITY`

## R5 identity

- Release ID: `R5-0.2.0-ONE-FABRIC-LIVE`
- Carrier: `r5/index.html`
- Carrier Git blob: `83bed6faef9e416995cf9770626cb7a5912589b5`
- Canonical public production URL: `https://8x8-os-ecosystem.vercel.app`
- Rollback R4: `/r4`
- Rollback R3: `/r3`

## Persistent guard

`.github/workflows/vercel-release-readback.yml` validates source/routing/blob consistency on PR and main pushes and performs production-domain readback on successful Vercel Production deployment events.

`scripts/verify_vercel_release_readback.py` fails closed on stale body, stale release header, stale release endpoint, auth-gated production, or broken rollback identity.

`release-identity.json` now carries the canonical public production URL, so production readback does not depend on a manual repository-variable setup. `PUBLIC_PRODUCTION_URL` remains an optional explicit override; if absent, the workflow uses the versioned release identity.
