# MSG226 Spatial Client Benchmark V1

## Release unit

`spatial-client-benchmark-v1`

## Purpose

Provide an evidence-backed client architecture decision for extending the existing 8x8 World and Art Board without creating another cockpit. This release is documentation and a public-safe benchmark fixture only. It adds no runtime engine, sensor permission, live identity, precise location, wallet, payment, private-core connection or production alias.

## Decision

1. Use **Babylon.js** as the preferred browser 3D engine for independently releasable spatial slices.
2. Use **MapLibre GL JS** as the preferred browser map and regional navigation layer.
3. Evaluate **CesiumJS** only where a real globe, terrain or large geospatial dataset is justified.
4. Keep **WebXR** optional, capability-detected and permission-gated. The standard remains a Candidate Recommendation Draft and carries material privacy and fingerprinting concerns.
5. Use **OpenUSD** as an offline authoring, composition and interchange contract. Do not make it the browser runtime authority or identity/event source of truth.
6. Treat **Roblox** and **Unreal Engine** as external clients beneath canonical 8x8 identity, event, capability, consent and receipt contracts.
7. Treat Unreal Pixel Streaming as a high-cost demonstration path, not the default public browser client.

## Canonical contract boundary

Every client adapter must consume a versioned public-safe contract containing:

- actor and synthetic-fixture identity class;
- capability and consent ceiling;
- coarse public zone, never precise public coordinates;
- normalized movement and interaction events;
- asset provenance and rights metadata;
- accessibility fallback behavior;
- immutable release and rollback identifiers;
- receipt and evidence references.

A client may render an event differently, but it must not redefine identity, authority, consent, financial state or evidence truth.

## Research evidence

- Babylon.js documents side-by-side WebGL and WebGPU support, including compute-shader capability and backwards-compatible engine use: https://doc.babylonjs.com/setup/support/webGPU/
- MapLibre GL JS is a TypeScript/WebGL library for interactive maps from vector tiles and exposes map, marker, navigation, geolocation, terrain and globe controls: https://maplibre.org/maplibre-gl-js/docs/
- CesiumJS is an open-source JavaScript library for 3D globes and maps, with current support for GeoJSON and vector-tile workflows: https://cesium.com/downloads
- The W3C WebXR Device API defines VR/AR device access and explicitly covers permissions, context isolation and fingerprinting considerations: https://www.w3.org/TR/webxr/
- OpenUSD provides scalable scene description, asset composition, layering and non-destructive overrides across digital-content tools: https://openusd.org/release/intro.html
- Roblox provides an integrated 3D experience engine and Open Cloud APIs, but its identity, execution and data model remain platform-owned and therefore require an adapter boundary: https://create.roblox.com/docs/experiences and https://create.roblox.com/docs/cloud
- Unreal Engine supports OpenXR clients and browser delivery through GPU-hosted Pixel Streaming over WebRTC: https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine

Research was verified on 2026-08-05 from the official project, standards-body and vendor documentation above.

## Benchmark interpretation

Scores in `public/world/spatial-client-benchmark.json` are architecture-review scores, not vendor performance claims. The weighting prioritizes browser delivery, mobile/accessibility behavior, governance fit and operational cost for the current protected beta.

No candidate receives authority merely by achieving a high score. Every implementation requires a separate exact-target release unit with bundle-size, frame-time, memory, accessibility, privacy, provenance, security and rollback evidence.

## Required implementation gates

### Babylon.js proof slice

- render inside the existing `/world/` route;
- lazy-load only after explicit user activation;
- retain keyboard, touch, reduced-motion, forced-color and screen-reader alternatives;
- publish no live identity or location;
- measure bundle transfer, initialization time, frame pacing and memory;
- preserve a 2D fallback if WebGL/WebGPU is unavailable.

### MapLibre proof slice

- use synthetic coordinates or a rights-cleared public demonstration dataset;
- display attribution required by the selected style and tile sources;
- never initialize GeolocateControl automatically;
- keep browser location local and temporary;
- test keyboard map navigation and a non-map textual route alternative.

### Cesium, WebXR, Roblox and Unreal

Remain blocked from automatic beta integration until target-specific cost, licensing, accessibility, permission, hosting, privacy, asset-rights and rollback evidence exists.

## Public boundaries

```text
MODE=PROTECTED_BETA_RESEARCH_FIXTURE
RUNTIME_IMPORTS_ADDED=0
DEVICE_PERMISSIONS_ADDED=0
NETWORK_ENDPOINTS_ADDED=0
PRECISE_LOCATIONS_ADDED=0
LIVE_USERS_ADDED=0
FINANCIAL_ACTIONS_ADDED=0
PRIVATE_CORE_CONNECTED=NO
PRODUCTION_ALIAS_CHANGED=NO
```

## Test

`node test/spatial-client-benchmark-smoke.mjs`

The static suite verifies the benchmark schema, scoring arithmetic, official source set, recommendation roles and fail-closed public boundaries.

## Rollback

Revert the MSG226 merge commit or restore protected-beta commit `b971512e6b3a698de91e0effb7bff441912a7fd1`. The rollback removes only the benchmark fixture, test and this document; no existing route behavior is altered.
