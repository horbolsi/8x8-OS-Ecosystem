# 8x8 System Ontology and Endpoint Boundaries

## Purpose

This document defines the recovered whole-system model of 8x8 and the rules for safely reaching every legitimate endpoint. It is a public-safe architecture map, not a substitute for fresh runtime receipts or private implementation evidence.

## Canonical definition

8x8 is a tracked, human-governed AI operating environment and operator fabric that coordinates agents, messages, files, databases, Studio artifacts, bots, cloud services, devices, public products and protocol experiments through identities, hashes, receipts, gates and privacy-aware context.

## Five dimensions

1. **Identity** — who is speaking or acting: agent IDs, owner identity, avatars, authority and signatures.
2. **Evidence** — what proves a claim: hashes, tests, reports, receipts, canaries and Merkle proofs.
3. **Memory** — what should persist: reviewed facts, sessions, summaries, contradictions and provenance.
4. **Work** — what should happen next: gates, missions, packets, tests, rollback and acceptance criteria.
5. **Interface** — how humans and agents observe and control the system: terminal, cockpit, dashboard, Studio, artboards, graphs, bots and public clients.

## Major system zones

| Zone | Role | Public boundary |
|---|---|---|
| Local Core | Termux, Ubuntu PRoot and controlled local workspaces | Private runtime only |
| 8x8 OS roots | Agents, bots, databases, content and historical/current system roots | Sanitized evidence only |
| Hermes environment | Agent sessions, memory, orchestration and tools | Roles and protocols may be public; raw sessions remain private |
| GitHub | Canonical code, schemas, reviewed branches, releases and receipts | Public-safe repositories and evidence |
| Message vault | Redacted evidence envelopes and session manifests | Private |
| Curated memory | Reviewed semantic and procedural memory | Private, with public-safe extracts |
| Context ledgers | Cross-source indexes, startup context and Merkle-backed provenance | Schemas may be public; records remain gated |
| Google Drive | Human-readable continuity and recovery mirror | Restricted or public-safe derivatives |
| Notion | Knowledge map, decisions, contradictions and navigation | Mirror only |
| Airtable | Connector, workstream and activation-gate registry | Metadata only |
| ClickUp | Long-horizon planning, decomposition and sub-agent seed work | Planning mirror only |
| Replit | Interactive full-stack app surface | Exact-release and security gated |
| Vercel / Render / Neon | Edge, durable API, worker and storage services | Release and credential gated |
| Telegram / Discord / Slack / Teams | Communication adapters | Separate identities, bounded context and explicit write gates |
| Studio | Text, image, audio, video, artboards and publishing workflows | Private-draft first; publication separately approved |
| Device mesh | Samsung, iPhone and future verified nodes | Attested endpoints only |
| Public User Edition | Tenant-isolated public product | No owner cockpit, secrets or unrestricted mutation |
| Protocol layer | Device, node, governance, organization and government interoperability | Designed and sandboxed until reviewed |

## Recovered council roles

| Identity | Intended role | Authority ceiling |
|---|---|---|
| FlashTM8 Owner | Sole high-risk decision authority and vision source | Owner approval authority |
| FlashTM8 Proxy | Owner-guided coordination proxy | No independent high-risk authority |
| Hermes | CLI orchestration, audits, gates and reports | Bounded writer |
| Claude | Independent logic and contract review | Advisory |
| ChatGPT | Research, synthesis, architecture and artifacts | Advisory / connector-bounded |
| OpenClaw | Code, tests, automation and tool review | Bounded implementation |
| Aegis | Security, privacy, secrets and policy review | Veto/review, not owner replacement |
| Trader | Market research and signals | Signal-only until separate gates pass |
| Architect | Topology, schemas, repositories and interfaces | Design/review |
| Scribe | Documentation, receipts and summaries | Documentation |
| Curator | Memory, source and artifact curation | Curation |
| Council Moderator | Quorum records, dissent and contradiction handling | Coordination |

These are recovered roles and design identities. A role is not `ACTIVE` or quorum-eligible without a current identity record, activation gate and runtime receipt.

## Endpoint reachability classes

Every endpoint must be assigned one class:

- `DIRECT_LIVE`: current connector or shell can read the endpoint now.
- `DIRECT_BOUNDED_WRITE`: current connector can perform a narrowly scoped reviewed write.
- `MIRRORED`: evidence exists in another source, but the endpoint is not live-connected.
- `HISTORICAL`: dated evidence exists but freshness has expired.
- `CONFIGURED_UNPROBED`: configuration is known but no successful current probe exists.
- `CONNECTED_EMPTY`: connector works but contains no relevant 8x8 material.
- `PERMISSION_BLOCKED`: a legitimate permission or account boundary prevents access.
- `UNAVAILABLE`: no connector, mount or live path exists in the current environment.
- `REJECTED`: access would require bypassing controls, exposing secrets or violating policy.

## Reach-all-ends rule

"Reach all ends" means:

1. discover each endpoint;
2. resolve its legitimate owner and identity;
3. classify its data and risk;
4. verify read access;
5. verify bounded write access only where authorized;
6. link it to a canonical GitHub artifact or runtime receipt;
7. define rollback and revocation;
8. keep high-risk actions disabled until their exact gate passes.

It never means bypassing permissions, scraping private conversations without consent, exposing credentials, activating wallets, publishing externally, modifying production, or granting permanent autonomous authority.

## Current connector findings

- Canva contains a whole-system artboard brief and 8x8 visual identity assets.
- ClickUp contains blockchain, tokenomics, launch, UX and sub-agent planning material.
- Notion contains the connector control plane, recovery program and creator/governance specifications.
- Airtable contains connector, workstream and activation-gate registries, but duplicate records require repair.
- Google Drive contains continuity, architecture, judge and mission evidence.
- Replit exposes one owned 8x8 interactive application.
- Slack public search contains no matching 8x8 material.
- Dropbox contains no matching 8x8 material.
- Box keyword matches are unrelated legacy files and are excluded.
- Microsoft Teams search is blocked for the connected personal Microsoft account type.
- Termux, Ubuntu PRoot and Android internal storage are represented by historical and mirrored evidence but are not live-mounted in this conversation.

## Truth boundaries

- Operational liveness means measurable identity, context, tasks, health, feedback and recovery. It does not imply sentience.
- `100/100` means all defined acceptance gates passed with current evidence. It does not mean infinite capability.
- No agent becomes self-authorizing.
- Hidden chain-of-thought, credentials, wallet secrets, unrestricted private messages and raw sensitive logs are prohibited from public artifacts.
- No single mirror is the sole truth. Runtime receipts, GitHub, message evidence and curated memory must reconcile through IDs, hashes and provenance.

## Missing implementation gates

1. Fresh local runtime and agent census.
2. Context-ledger and cross-source-index schema audit.
3. Agent identity registry with activation and revocation records.
4. Connector deduplication and freshness repair.
5. Public/private route and tenant isolation validation.
6. Release-SHA reconciliation across Replit, Vercel, Render and databases.
7. Studio provenance and publication-gate validation.
8. Market, wallet, token, treasury and governance separation.
9. Device attestation and node-registration protocol.
10. Independent security, privacy, reliability and rollback acceptance.

## Publication rule

Only public-safe, current and reproducible evidence may be used in public claims. Design material must be labeled `DESIGNED`; historical runtime evidence must include its date; simulated systems must remain visibly `SIMULATED`; unknown state must remain `UNKNOWN`.
