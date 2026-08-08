# REPOSITORY_MAP

## Purpose

Define repository roles and prevent contradictory live/canonical claims.

## Repository Classifications

- **Canonical:** approved source of truth for architecture and release claims.
- **Runtime:** active execution targets and deployment-facing code.
- **Evidence:** receipts, logs, probes, and reproducibility artifacts.
- **Experimental:** unapproved prototypes with no production claims.
- **Archive:** frozen historical repositories, blocked from live use.
- **Quarantined:** imported or unverified assets pending sanitization/review.

## Current Canonical Assignment

- **Public canonical repository:** `horbolsi/8x8-OS-Ecosystem`
- **Private canonical implementation source:** pending owner approval and documented verification

## Reconciliation Requirements

- Audit every accessible repository directly.
- Add explicit role declarations in each repository README.
- Reconcile overlapping implementations and preserve missing capabilities via reviewed extraction.
- Freeze archives/backups against accidental runtime use.
- Reconcile open PR strategy conflicts (`#3`, `#16`, `#17`) before independent merges.
