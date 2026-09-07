# CinemaProof — submission runtime and provenance

CinemaProof is a standalone Agentic Cinema 2026 competition build inside this pre-existing public repository.

## New-project provenance

The repository predates the competition project. The CinemaProof product itself began at commit `23f50fe5427a608ed80e24a42c7700551ea2e29c` on 2026-09-07T10:14:09Z. The twelve-commit implementation range is:

- base before CinemaProof: `6a89b54075703abd2bfc4863370f15bb7886eadd`
- first CinemaProof commit: `23f50fe5427a608ed80e24a42c7700551ea2e29c`
- current submitted source head: `176bcc13b3c2988960bedf86fd1b4f144de466f2`

Use the GitHub compare view to audit the project-specific source:
https://github.com/horbolsi/8x8-OS-Ecosystem/compare/6a89b54075703abd2bfc4863370f15bb7886eadd...176bcc13b3c2988960bedf86fd1b4f144de466f2

## Public runtime

- App: https://8x8-os-ecosystem.vercel.app/cinemaproof
- Gemini status: https://8x8-os-ecosystem.vercel.app/api/cinemaproof
- Parallel grounding status: https://8x8-os-ecosystem.vercel.app/api/cinemaproof-grounding
- Parallel live probe: https://8x8-os-ecosystem.vercel.app/api/cinemaproof-grounding?probe=1

A successful HTTP response proves reachability only. A live Gemini result must contain `mode: "live-gemini"` and `runtime: "LIVE_GEMINI"`. A demo or fallback result is not live Gemini proof.

## Local run

Requirements: Node.js 20 or later.

```bash
git clone https://github.com/horbolsi/8x8-OS-Ecosystem.git
cd 8x8-OS-Ecosystem
cp .env.example .env
npm install
npm start
```

Set `GEMINI_API_KEY` in the runtime secret store to activate the Gemini path. Never commit the key. The Parallel Search MCP path currently uses its documented anonymous free-tier endpoint.

Example status checks:

```bash
curl -fsS http://localhost:3000/api/cinemaproof
curl -fsS http://localhost:3000/api/cinemaproof-grounding
```

Example action:

```bash
curl -fsS -X POST http://localhost:3000/api/cinemaproof \
  -H 'content-type: application/json' \
  -d '{"brief":"One-day greenhouse short with minimal VFX.","overrideMode":"remove-exterior"}'
```

## Verification boundary

The current implementation includes the Google GenAI SDK and a Gemini API path. Google Cloud Agent Builder / Vertex AI Agent Engine activation is not implemented or verified in this source head. Do not describe that requirement as complete until an exact Google Cloud resource, deployed agent identity, action receipt, and second-pass result are recorded.

This project does not perform payments, wallet signing, token minting, mainnet operations, or live trading.
