# Proof-Carrying Execution Fabric V1 — Public-Safe Capability Record

©️8x8 by FlashTM8 ⚡️🌎🤖 | ♾️x♾️ ∞₈x₈∞ OS

## What is implemented

The private 8x8 engineering estate now contains a framework-neutral Proof-Carrying Execution Fabric V1. Its purpose is to make mission state explicit and auditable instead of equating process success with system success.

The public-safe contract exposes only the semantics that can be documented without revealing private runtime topology:

`CREATED → PICKED_UP → LEASED → STARTED → PROGRESS → EFFECT_COMMITTED → VERIFIED → TERMINAL`

A permitted fail-closed path terminates as `FAILED_SAFE`.

The implementation includes:

- durable SQLite mission persistence;
- compare-and-swap state transitions;
- unique idempotency keys;
- explicit lease metadata and expiry enforcement;
- runtime-binding fields without publishing private runtime values;
- canonical SHA-256 digests for mission material;
- append-only hash-chained transition receipts;
- optional secret-backed integrity tags;
- deterministic reopen/replay verification;
- a portable JSON receipt schema;
- exact-head CI tests covering success, stale workers, duplicate idempotency, failure terminalization, persistence/reopen, expired leases and tamper detection.

## Evidence boundary

The bounded implementation/test result does **not** establish:

- autonomous local pickup;
- cross-device delivery;
- exactly-once external side effects;
- production-scale throughput;
- live trading or mainnet activity;
- external deployment/publication state;
- whole-system 100/100.

Those remain separate evidence gates and require their own receipts.

## Why this matters

The execution primitive is intentionally independent of any single AI or workflow framework. Agent runtimes, model routers, councils, connectors, devices and future external orchestration systems can adapt to the same mission-state law without replacing One Fabric.

This lets 8x8 distinguish three facts that are commonly collapsed together:

1. code ran;
2. an effect was committed;
3. the committed effect was independently verified.

Only the third may advance a mission to `VERIFIED`.

## Current private-core evidence locator

The implementation was merged into the private `horbolsi/8x8` engineering repository through PR #126 on 2026-08-10 after exact-head CI and review checks passed. The public repository intentionally does not reproduce private code or runtime topology.

This record is a public-safe projection of an implemented capability, not a claim that every 8x8 subsystem has already adopted it.
