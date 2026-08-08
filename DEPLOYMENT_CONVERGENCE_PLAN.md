# 8x8 Deployment Convergence Plan

## Purpose

Unify the currently split 8x8 delivery estate without destroying working legacy paths or confusing previews with production.

## Confirmed split

- Replit contains an owned 8x8 application and legacy/active product behaviors.
- Vercel project `8x8-os-ecosystem` is Git-linked to `horbolsi/8x8-OS-Ecosystem`; production currently follows `main`, while PR branches create previews.
- Vercel project `8x8-ecosystem` is a separate production project whose recent deployments expose no Git commit metadata.
- GitHub contains public, private, backup, unified, memory, messages, Hermes sync, A-to-Z, and blockchain repositories.

These surfaces must not be called one deployment until their source SHA, schema, assets, routes, and authority boundaries are reconciled.

## Target architecture

The canonical model is one core with multiple governed adapters:

1. Core contracts: identity, authority, missions, receipts, memory, plugin registry, events, schemas, security and observability.
2. Experience shell: bubbles, widgets, windows, command deck, 360 world and visual council.
3. Runtime adapters: Termux/Ubuntu, Replit, Vercel/serverless, databases and local services.
4. Channel adapters: Telegram bot and Mini App, Discord bot and embedded experiences, web, PWA and notifications.
5. Mobile packaging: iOS and Android clients using the same public-safe APIs and identity contracts.
6. Plugin packs: Studio, communications, markets, blockchain, creator tools, education, community and approved third-party modules.

## Preservation rules

- No destructive migration from Replit or legacy Vercel until inventory, export, hashes and rollback are complete.
- Existing bubbles, widgets, windows, bots, owner controls and data flows remain compatibility targets.
- Private owner functions never become public-client capabilities.
- Simulated features remain labeled and cannot silently become financial, governance or production actions.
- Every deployment must report source repository, commit SHA, environment, schema version and capability manifest.

## Required convergence sequence

1. Inventory both Vercel projects and Replit by routes, features, assets, data stores, environment dependencies and source provenance.
2. Select canonical core contracts in GitHub after reviewing `8x8-OS-Ecosystem`, `8x8-OS-unified`, `8x8-os-hub`, `8x8`, memory, messages and Hermes-safe evidence.
3. Define compatibility manifests for bubbles, widgets, windows, plugins and 360-world experiences.
4. Port or wrap features behind stable adapters. Do not perform blind repository merges.
5. Establish one release train: feature branch -> preview -> integration canary -> owner acceptance -> production promotion.
6. Retire duplicate Vercel production only after traffic, domains, assets, data and rollback are proven.
7. Package Telegram Mini App and Discord clients from the same public-safe web shell and API contracts.
8. Build PWA first, then native iOS/Android wrappers or clients after identity, privacy, payments and store-policy gates pass.
9. Publish a signed capability manifest and sanitized receipt for every channel release.

## Surface status

| Surface | Current classification | Next gate |
|---|---|---|
| Replit 8x8 app | Separate implementation under compatibility audit | Fresh feature/data/source report and completed-upgrade verification |
| Vercel `8x8-os-ecosystem` production | Git-linked legacy production from `main` | Merge reviewed canonical changes only after functional and security acceptance |
| Vercel PR previews | Review environments | Validate exact SHA and do not describe as production |
| Vercel `8x8-ecosystem` production | Separate unproven-origin production | Determine source provenance and preserve before consolidation |
| Telegram bots | Historically implemented | Fresh bot inventory, auth, commands, telemetry and Mini App contract |
| Telegram Mini App | Planned/not freshly verified | Public-safe shell, Telegram auth, test deployment and review |
| Discord bot | Historically implemented | Fresh identity, commands, permissions and health evidence |
| Discord embedded/app experience | Planned/not freshly verified | Adapter implementation and Discord review gates |
| PWA | Required convergence bridge | Manifest, offline behavior, installability, privacy and update strategy |
| iOS App Store | Not deployed | Apple developer, signing, privacy, review and native packaging gates |
| Google Play | Not deployed | Play Console, signing, data safety, testing and packaging gates |

## Completion rule

Convergence is complete only when all retained surfaces consume compatible core contracts, expose provenance and health, pass channel-specific tests, preserve rollback, and have explicit owner acceptance. A shared logo or similar screen is not convergence.