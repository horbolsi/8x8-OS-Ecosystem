# 8x8 OS — Full System Map

This document describes the complete known scope of 8x8 OS while separating verified implementation from private runtime evidence, experimental work, simulations, and design intent.

## System identity

8x8 OS is a human-governed AI operations and coordination platform. It combines owner authority, specialized agents, persistent memory, mission execution, communication channels, software-development workflows, content and media tools, market intelligence, Web3 experiments, and distributed runtime nodes.

It is not currently a replacement hardware kernel. It runs across existing operating systems, application runtimes, repositories, hosted workspaces, messaging platforms, databases, and connected tools.

## Twelve system domains

### 1. Owner authority and governance

Purpose:
- Establish the human owner as the root authority.
- Apply roles, permissions, approval gates, leases, emergency stop, and bounded autonomy.
- Preserve an auditable distinction between proposed, approved, executing, completed, failed, and revoked work.

Known implementation:
- Replit contains Telegram HMAC authentication, persisted user roles, bans, permissions, subscriptions, settings, and owner/admin controls.
- Private runtime reports describe authority leases, emergency revoke, registered-operation checks, and gated high-impact actions.

Current boundary:
- Replit governance voting is not production governance. It lacks secure quorum, wallet signatures, execution controls, and finalized audit history.

### 2. Agent coordination and identities

Purpose:
- Coordinate specialized agents under a primary orchestrator.
- Support delegation, task ownership, handoff packets, debate, reconciliation, and evidence receipts.

Known agent identities include Hermes, Jarvis, Seraphim, Aegis, Volt, Trader, Canvas, Pulse, Nova, Scribe, Wrench, Archon, and Sage.

Known implementation:
- Replit has a real 30-second agent cycle, overlap guard, state persistence, WebSocket events, and error containment.
- The safe synchronization repository contains agent identity, profile, memory, and architecture documents.
- Private-runtime evidence describes a larger registered agent population and mission coordination fabric.

Current boundary:
- Several Replit agents consume static or imported data and do not yet perform their claimed external actions.
- Public documents must distinguish active agents, simulated agents, design roles, and archived identities.

### 3. Mission and control fabric

Purpose:
- Convert owner intent into controlled missions.
- Track task IDs, agent identity, leases, lifecycle states, hashes, receipts, cleanup, and rollback.

Known implementation:
- Private-runtime evidence describes a persistent control-fabric service, mission executor, continuity supervisor, health checks, bounded recovery, canary receipts, and an emergency stop.
- GitHub work shows mission-numbered branches, evidence packages, protected beta work, and review-gated pull requests.

Current boundary:
- The public repository does not yet contain a reproducible control-fabric demo or sanitized receipt verifier.

### 4. Memory, knowledge, and continuity

Purpose:
- Preserve user intent, system history, agent memory, knowledge, and mission continuity across sessions and nodes.

Known implementation:
- Dedicated private repositories exist for memory and messages.
- Safe-mirror content includes memory consolidation patterns, user profiles, identity files, and agent memory rules.
- Replit reads file-based agent memory and persists agent-loop state.

Current boundary:
- Replit does not currently provide a verified vector database or semantic retrieval index.
- Private memory must never be exposed through public APIs, repositories, logs, or build artifacts.

### 5. Distributed runtime and node mesh

Purpose:
- Run coordinated services across phones, Termux, Ubuntu PRoot, hosted workspaces, cloud environments, repositories, and messaging surfaces.

Known environments:
- Android Termux
- Ubuntu PRoot
- Replit
- GitHub and Codespaces
- Telegram
- Additional connected tools and hosted services

Known implementation:
- Replit provides a device relay with message ingestion, redaction, polling, acknowledgements, per-node scoping, and admin status.
- Private runtime evidence describes multi-service supervision, heartbeats, local node execution, and continuity after browser closure.

Current boundary:
- No public compatibility matrix or independently reproducible multi-node demo currently exists.

### 6. Connectors and tool intelligence

Purpose:
- Connect agents and missions to repositories, messaging systems, APIs, databases, local tools, cloud tools, and business services.

Known implementation:
- GitHub repository intelligence, commit history, capability graph parsing, caching, redaction, and stale-mirror alerts are implemented in Replit.
- GitHub, Replit, Telegram, device relay, and AI-provider integrations have verified code paths.

Current boundary:
- Connector presence does not prove every connector is configured, authenticated, healthy, or authorized for every action.

### 7. Communications and owner briefing

Purpose:
- Deliver owner reports, system alerts, mission status, and controlled external communications.

Known implementation:
- Telegram Mini App authentication, Telegram bot wiring, stale-repository alerts, device relay, WebSocket events, and owner/admin interfaces exist.
- Private runtime reports describe Telegram and Discord bot fleets and scheduled briefings.

Current boundary:
- Discord and email are absent from the audited Replit implementation.
- Public claims must identify the environment in which each channel is actually active.

### 8. Studio and media production

Purpose:
- Support text, image, speech, audio, video, publishing, multilingual content, and production workflows.

Known implementation:
- Replit contains AI chat, vision, image generation, speech-to-text, voice, batch processing, onboarding, live video embeds, and a bubble-based interface.
- Private runtime reports describe a larger 8x8 Studio service and content pipeline.

Current boundary:
- API keys and production configuration are not confirmed for every media route.
- Video generation, publishing automation, and a durable content-management system are not verified in Replit.

### 9. Markets and trading intelligence

Purpose:
- Collect market data, compute indicators, generate research, evaluate risk, and support tightly controlled trading workflows.

Known implementation:
- Replit has live BTC feeds from multiple exchanges and computes indicators client-side.
- Aegis-style risk thresholds and trader-agent state exist in the agent loop.
- Private runtime evidence describes dedicated crypto and trading-intelligence lanes.

Current boundary:
- Replit does not have verified exchange order routing or broker execution.
- Simulated trading state must never be described as live trading.

### 10. Blockchain and Web3

Purpose:
- Explore wallets, tokens, NFTs, governance, staking, multi-chain intelligence, and decentralized coordination.

Known implementation:
- Wallet connection paths exist.
- A Solidity ERC-20 and staking experiment compiles in a development environment.
- A dedicated private blockchain repository exists.

Current boundary:
- NFT minting, blockchain transactions, staking, governance, and tokenomics displayed in Replit are largely simulated, local, or undeployed.
- No mainnet deployment may be claimed without chain IDs, contract addresses, transaction evidence, source verification, and security review.

### 11. Security, monitoring, and recovery

Purpose:
- Protect authority, secrets, data, runtimes, and execution paths while providing health visibility and bounded recovery.

Known implementation:
- Role-based access control, relay rate limits, redaction, agent-loop containment, basic health and system-stat routes, stale-mirror alerts, and private continuity supervisors exist in different environments.

Critical deployment blockers discovered in Replit:
- Hardcoded administrator-secret fallback
- Manual authentication backdoor without a production guard
- Real shell execution protected only by role and blacklist filtering
- Sensitive imported phone data within the workspace
- Missing strict CORS and broad rate limiting
- Incomplete dependency health checks, logging, and migration safety

These blockers prohibit a public production deployment until remediated and verified.

### 12. Public product, education, and ecosystem

Purpose:
- Make the system understandable, reproducible, extensible, teachable, and commercially usable without exposing private operations.

Public surfaces:
- `8x8-OS-Ecosystem`: canonical public front door and public-safe demonstrations.
- `8x8-os-a-z`: educational and architectural companion.

Required public deliverables:
- Reproducible demo
- Verified capability ledger
- Sanitized receipts
- Security and threat model
- Compatibility matrix
- Contributor guide
- Public API boundaries
- Release notes and checksums
- Clear commercial-use and licensing terms

## Capability labels

Every capability must use one of these labels:

- **Verified public** — reproducible from public code and tests.
- **Verified private/runtime** — supported by current private evidence but not publicly reproducible.
- **Experimental** — real code exists but operational reliability is not established.
- **Simulated** — behavior uses mock, static, generated, imported, or in-memory data.
- **Design-only** — documented intent without an executing implementation.
- **Blocked** — implementation exists but security, configuration, legal, or operational gates prevent release.
- **Unknown** — repository or environment requires a fresh direct audit.

## Non-negotiable truth rule

No capability moves to “verified public” because it appears in a user interface, README, architecture diagram, agent narrative, imported snapshot, or historical report. It must have current code, a reproducible execution path, tests, and evidence appropriate to the claim.