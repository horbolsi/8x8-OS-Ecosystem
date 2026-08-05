# MSG227 Seraphim World Onboarding V1

## Release unit

`seraphim-world-onboarding-v1`

## Scope

Extend the existing `/world/` route with a voluntary five-step Seraphim guide. This release does not create another cockpit, route, account, agent runtime or communication channel.

## Public behavior

- the guide opens only after the user selects **Start guided tour**;
- the five steps explain truth state, movement and privacy, synthetic world navigation, temporary coarse-zone presence and governed product portals;
- the current target is visibly highlighted while the dialog remains open;
- Previous, Next, Finish, Close and Escape behavior are keyboard accessible;
- closing restores focus to the launch control;
- no tour state is persisted or transmitted.

## Persona and rights

Seraphim is represented only by the existing text label and abstract star glyph. This release adds no photograph, cloned likeness, third-party character, external logo, voice, biometric record or scraped persona asset. The guide copy is authored specifically for this release and is treated as a rights-cleared synthetic fixture.

## Accessibility and responsive behavior

- native dialog and button semantics;
- title and description relationships;
- polite live step progress;
- minimum 44px controls;
- visible keyboard focus;
- phone layout below 640px;
- reduced-motion behavior;
- forced-color borders and highlight semantics;
- focus restoration and Escape cleanup.

## Security and privacy boundaries

No browser storage, cookies, analytics, network calls, identity lookup, precise location access, camera, microphone, Bluetooth, Wi-Fi, wallet, checkout, signing, payment, private-core connection or production alias change is introduced.

## Validation

`node test/seraphim-world-tour-smoke.mjs`

The suite performs static checks for integration, five-step scope, DOM safety, dialog accessibility, responsive behavior, provenance language and prohibited browser capabilities. Existing protected-beta regressions remain mandatory through `npm test`.

## Release gate

This slice may be promoted to `beta/8x8-dual-monitor-v0.1` only after exact-head GitHub workflows pass, the Vercel branch deployment is READY, `/world/` returns HTTP 200, the new assets return HTTP 200 and deployed source truth markers match the exact head.

## Rollback

Revert the MSG227 merge commit or restore protected-beta commit `c4ceaf9a0e68f9cc4692d5b588d4880fd2f9139f`. Rollback removes `public/world/seraphim-tour.js`, `public/world/seraphim-tour.css`, this test and documentation, and restores the prior `public/world/accessibility.js` and `package.json`.
