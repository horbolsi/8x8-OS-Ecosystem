# MSG228 Public Product Map and Demonstration V1

## Release unit

`public-product-map-demo-v1`

## Purpose

Provide a public-safe, machine-readable product map and a repeatable demonstration path across the existing protected-beta routes. This release adds no cockpit, runtime, account, sensor permission, network endpoint, payment path or private-system connection.

## Demonstration script

1. Open `/art-board/` and identify the protected-beta truth state, evidence inspector and synthetic regional presence.
2. Use keyboard-only navigation to reach the World link and open `/world/`.
3. Start the voluntary Seraphim guided tour. Confirm focus enters the dialog, step progress is announced and Escape restores focus.
4. Demonstrate keyboard and touch movement. Keep presence synthetic and coarse. Do not enable precise-location sharing.
5. Open `/scan/` and show the distinction between source-present, implementation-pending, testnet and mainnet states. Confirm zero live chain queries and a disconnected wallet.
6. Open `/marketplace/` and filter synthetic listings. Confirm checkout and payments are unavailable.
7. Open `/missions/` and draft a bounded local mission packet. Confirm no network send, persistence or remote execution occurs.
8. Open `/plugins/` and inspect publisher, provenance, capability, sandbox, accessibility and rollback gates. Confirm no plugin is installed or executed.
9. Enable reduced motion and forced colors in the operating system or browser emulation and repeat the primary navigation path.
10. Verify the public product map at `/product-map.json` and compare each route's truth markers with the visible interface.

## Accessibility evidence checklist

- Keyboard path reaches every route and primary control.
- Touch targets are at least 44 CSS pixels where declared by each release unit.
- Screen-reader status and dialog progression are understandable without visual context.
- Reduced-motion mode suppresses nonessential movement.
- Forced-color mode preserves labels, borders, focus and state distinctions.
- Phone, tablet and desktop layouts do not hide required controls or truth markers.

## Privacy and safety evidence checklist

- Synthetic or consented fixtures only.
- No precise public location.
- No live chat or calls.
- No Bluetooth or Wi-Fi mesh.
- No wallet, payment, signing or financial execution.
- No production alias change.
- No private control-plane connection or topology disclosure.

## Validation contract

The release unit reaches 100/100 only after:

- JSON schema and route assertions pass at the exact feature head;
- existing protected-beta regressions pass at the same head;
- Vercel branch deployment is READY;
- `/product-map.json` returns HTTP 200 and matches the exact commit;
- no secrets, private topology, financial execution or new permissions are introduced;
- rollback to the pre-release beta commit is recorded.

## Rollback

Close or revert the pull request before merge. After merge, revert the release merge commit or restore the recorded pre-release beta head. Production aliases must remain unchanged.
