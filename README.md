# 8x8 OS

**A human-governed AI operations platform for coordinating specialized agents, memory, tools, services, communications, creative production, and Web3 workflows across local, cloud, and edge environments.**

8x8 OS is not presented here as a replacement for Linux, Windows, or a hardware kernel. It is an orchestration and execution layer built on existing operating systems and runtimes.

## What 8x8 is designed to do

- Coordinate specialized AI agents and bounded task delegation
- Preserve continuity through persistent memory and evidence-backed handoffs
- Run approval-gated missions with receipts, health checks, and recovery controls
- Connect local devices, servers, repositories, APIs, messaging channels, and databases
- Support research, communications, content production, automation, and Web3 modules
- Keep consequential actions under explicit owner authority and emergency-stop controls

## Eight system layers

| Layer | Purpose |
|---|---|
| 1. Human governance | Owner authority, approval gates, leases, policies, and emergency stop |
| 2. Agent coordination | Task routing, delegation, debate, handoffs, and specialized roles |
| 3. Memory and intelligence | Persistent memory, retrieval, knowledge, continuity, and evidence reconciliation |
| 4. Mission execution | Queues, services, schedules, health checks, bounded recovery, and receipts |
| 5. Connectors and tools | GitHub, messaging, APIs, databases, local tools, and cloud services |
| 6. Studio and communications | Text, image, audio, video, publishing, and multilingual workflows |
| 7. Crypto and Web3 | Blockchain intelligence, wallets, token systems, governance, and risk-bounded research |
| 8. Distributed runtime | Phones, Linux environments, containers, cloud workspaces, and edge nodes |

## Public capability status

This repository distinguishes evidence from aspiration. The labels below are intentionally conservative.

| Capability | Public status |
|---|---|
| Web application and API foundation | Implemented in this repository |
| Agent-oriented architecture and educational console | Public companion implementation in `8x8-os-a-z` |
| Multi-agent orchestration | Experimental; broader implementation evidence is being consolidated |
| Persistent memory and continuity | Experimental; public interfaces and sanitized evidence are being prepared |
| Approval-gated mission execution | Experimental; public demonstrations are planned |
| Multi-device and service supervision | Private/runtime implementation; sanitized public evidence pending |
| Studio, communications, and Web3 modules | Mixed prototype and implementation stages |
| Enterprise, medical, industrial, and edge-AI products | Product directions, not completed certified offerings |

## Repository map

- **8x8-OS-Ecosystem**: canonical public entry point, product surface, architecture, and demonstrations
- **8x8-os-a-z**: educational architecture, runnable examples, and public documentation
- Private repositories: operational code, memory, messages, blockchain work, snapshots, and sensitive runtime material under review before publication

## Current repository application

The code currently included here provides a Node.js application foundation:

- Node.js 20+
- Express 5 backend
- REST/API surface
- Environment-based configuration
- Web3-oriented feature modules and user interface assets

```bash
cp .env.example .env
npm install
npm start
```

Do not place production secrets in `.env` files committed to Git.

## Governance principles

1. Humans retain final authority over consequential actions.
2. Autonomy must be bounded by scope, time, identity, and policy.
3. Every important operation should produce inspectable evidence or a receipt.
4. Safety controls must fail closed when authority or evidence is missing.
5. Public claims must be marked as implemented, experimental, designed, or planned.
6. Sensitive private runtime data must never be published merely for visibility.

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Capability status](CURRENT_STATUS.md)
- [Security model](SECURITY.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)

## Public roadmap

The next public milestones are a reproducible local demo, an approval-gated mission example, receipt verification, a multi-agent handoff demonstration, an emergency-stop demonstration, automated tests, and sanitized architecture evidence.

## Project direction

8x8 OS can support commercial products such as managed agent operations, private AI deployments, workflow modules, enterprise support, edge appliances, consulting, and training. Revenue examples are market scenarios, not guaranteed project earnings.

## License and responsibility

Review the repository license before reuse. Experimental automation, financial, medical, industrial, and security-related components must not be treated as certified production systems without independent testing, compliance work, and domain-specific validation.

---

**FlashTM8 ⚡️ | 8x8 OS**
