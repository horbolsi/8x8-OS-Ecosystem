# 8x8 OS Public Program — Projects Carrier Projection Receipt

**Brand:** ©️8x8 by FlashTM8 ⚡️🌎🤖  
**Canonical root:** `fabric://8x8/core`  
**Date:** 2026-08-12  
**Projection target:** `horbolsi/8x8-OS-Ecosystem` public carrier  
**Canonical source:** `8x8org/8x8-user-edition`

## Purpose

Project the already-reviewed 8x8 OS Public Program Projects ledger onto the current production carrier without changing the root R4 interface, the separate R5 candidate, or preserved R3 rollback.

## Canonical source receipt

- Canonical source merge commit: `f2a41d33f3c016b6fdb5e02cf695f0753fb8c2b7`
- `public/projects/races.json` canonical blob SHA: `7de422dd636b033df910c2b1ffd50e3aead06e20`
- `projects/index.html` canonical blob SHA: `367db751355919bf89fd72812d636bb357f81cd8`

## Carrier parity

The carrier branch contains byte-identical copies:

- `public/projects/races.json` carrier blob SHA: `7de422dd636b033df910c2b1ffd50e3aead06e20`
- `projects/index.html` carrier blob SHA: `367db751355919bf89fd72812d636bb357f81cd8`

No carrier-specific race truth was introduced. The carrier is a projection of the canonical public source.

## Routing delta

Only these explicit routes are added before the existing generic fallback:

- `/projects` → `/projects/index.html`
- `/projects/` → `/projects/index.html`

Existing root, `/r3`, `/first-blink`, `/world`, `/art-board`, `/stable`, and generic fallback behavior are otherwise preserved.

## Truth boundary

- OpenAI Build Week remains `SUBMITTED_OUTCOME_PENDING`; no rank or winner claim is made.
- Build with Gemini XPRIZE remains `BUILDING_NOT_SUBMITTED`; engineering and submission gates remain separate.
- Watchlist races are not represented as entered.
- Private communications, credentials, private runtime topology, signing authority, and private account data are not published.
- This receipt does not claim production deployment until an exact preview/production carrier receipt proves `/projects` and the registry are reachable.

## Rollback

Revert the carrier projection PR. No R3, R4, or R5 content blob is modified by this projection.

**©️8x8 by FlashTM8 ⚡️🌎🤖 | One Fabric first | canonical source → byte-identical carrier projection**
