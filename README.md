# 8x8 OS Ecosystem Companion

This repository is a **public-safe compatibility and historical companion** for 8x8 OS.

The canonical hackathon implementation, security work, architecture, and judge instructions live at:

- https://github.com/horbolsi/8x8
- https://github.com/horbolsi/8x8/pull/67

## Public safety boundary

This companion build is read-only and fixture-based. It does not contain administrator credentials and it cannot:

- execute trades or staking operations;
- move wallet assets;
- mint NFTs;
- publish content or send external messages;
- change credentials or production systems;
- delete private data;
- grant owner or administrator access.

Sensitive routes return `403 PUBLIC_DEMO_GATED`.

## Quick start

```bash
cp .env.example .env
npm install
npm start
```

Test the compatibility API:

```bash
curl -sS http://127.0.0.1:3000/api/health
curl -sS http://127.0.0.1:3000/api/gates
curl -sS http://127.0.0.1:3000/api/judge/plan \
  -H 'content-type: application/json' \
  -d '{"goal":"Review a deployment issue and propose safe steps"}'
```

## Truth model

- `LIVE`: current server or gate state.
- `SIMULATED`: deterministic fixture data.
- `UNKNOWN`: private operational evidence is intentionally unavailable.

This repository is not the source of truth for production deployment, private memory, messaging, wallet state, bot credentials, or device control.

## Security

Previously committed administrator values must be considered compromised and rotated wherever they were reused. Removing them from a branch does not erase Git history.

See [SECURITY.md](SECURITY.md).

## License

MIT License. See [LICENSE](LICENSE).
