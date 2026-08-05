# Security Policy

## Reporting

Do not open a public issue containing credentials, private keys, access tokens, personal data, internal network details, or an exploitable vulnerability. Use GitHub's private security reporting when enabled, or contact the repository owner privately.

## Trust model

8x8 OS assumes that agents, tools, connectors, models, and nodes can fail or return incomplete information. Authority must therefore be explicit, bounded, revocable, and independently checked at execution time.

## Required controls

- Least-privilege credentials and scoped connector permissions
- No secrets committed to Git
- Human approval for consequential or irreversible actions
- Time-bounded authority leases
- Immutable operation registration or equivalent allowlisting
- Emergency stop and revocation paths
- Structured logs and tamper-evident receipts
- Bounded retries and fail-closed behavior
- Dependency, secret, and vulnerability scanning
- Separation of development, test, and production data

## Sensitive domains

Financial, medical, legal, industrial-control, identity, and security workflows require independent validation and applicable compliance controls. Experimental components must not be treated as certified systems.

## Public evidence hygiene

Before publishing runtime evidence, remove secrets, personal information, device identifiers, internal paths that create risk, and customer data. Sanitization must not alter the meaning of the evidence.
