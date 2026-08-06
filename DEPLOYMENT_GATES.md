# DEPLOYMENT_GATES

The program is not complete until every applicable gate passes for the **exact release commit** and **named environment**.

## Required Gates

- [ ] Canonical architecture docs approved (`FULL_SYSTEM_MAP.md`, `REPOSITORY_MAP.md`)
- [ ] Repository role declarations completed and reconciled
- [ ] Security hardening controls implemented and tested
- [ ] Agent/control-fabric lifecycle evidence verified
- [ ] Memory continuity and retention policy verified
- [ ] Connector matrix validated by channel and permissions
- [ ] Studio/media implementation separated from planned capabilities
- [ ] Trading/blockchain live-vs-simulated boundaries verified
- [ ] Reproducible clean-start demo completed
- [ ] CI and security checks passing for release commit
- [ ] Threat model and security policy published
- [ ] Compatibility/node matrix published
- [ ] Sanitized screenshots/diagrams/receipts/demo artifacts published
- [ ] Release metadata complete (roadmap, templates, checksums, license review)

## Evidence Rule

A UI element, README statement, imported snapshot, agent narrative, historical report, or successful preview is not proof of production behavior.
Each completion claim must identify:

1. Current code revision
2. Tests/checks executed
3. Execution evidence
4. Environment name
5. Explicit limitations
