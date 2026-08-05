# MSG225 World Presence Consent V1

## Release unit

`world-presence-consent-v1`

## Scope

This release extends the existing `/world/` route with a fixture-only coarse-zone presence preview. It does not create another cockpit or route.

## Public behavior

- presence remains off until a user activates the consent control;
- only three synthetic, rights-clear text records are shown;
- zones are coarse public labels, never coordinates;
- consent expires after 30, 60 or 120 seconds;
- leaving the page clears the consent state;
- no state is stored or sent;
- live people remains exactly zero.

## Accessibility

- native labels and controls;
- minimum 44px control height;
- polite screen-reader status updates;
- phone, tablet and desktop reflow;
- reduced-motion behavior;
- forced-color borders and hierarchy.

## Security and privacy boundaries

No network requests, browser storage, cookies, precise location, camera, microphone, Bluetooth, Wi-Fi, wallet, checkout, signing, payment or private-core connection are introduced.

## Provenance

The visible records are authored synthetic fixtures created for this release. They use text-only identities and no third-party likeness, logo, photograph or location dataset.

## Test

`node test/world-presence-consent-smoke.mjs`

The test contains 24 static checks covering consent, expiry, DOM safety, privacy, accessibility, responsive behavior and prohibited capabilities.

## Rollback

Revert the MSG225 merge commit or restore the previous protected-beta branch head. The rollback removes `public/world/presence-consent.js`, `public/world/presence-consent.css`, the test and this document, and restores the previous `public/world/accessibility.js` and `package.json`.
