export const FEATURE_001 = Object.freeze({
  id: '001',
  slug: 'three-horizon-fabric-atlas',
  name: 'Three-Horizon Fabric Atlas',
  canonicalRoot: 'fabric://8x8/core',
  sourcePolicy: 'config/ONE_FABRIC_THREE_HORIZON_INTERFACE_TOPOLOGY_V3.json',
  sourcePolicyBlob: 'b5a451607a8d056f5b392478df6862822d864f96',
  evidenceObservedAt: '2026-08-18T09:02:44Z',
  state: 'SOURCE_CANDIDATE_RUNTIME_UNCLAIMED',
  realities: Object.freeze({
    past: Object.freeze({
      label: 'PAST_PRESERVED',
      sourceId: 'truth://8x8/one-fabric/past',
      truthState: 'VERIFIED_HISTORICAL_OR_ARTIFACT',
      privacyClass: 'SOURCE_BOUND_MIXED',
      authorityState: 'READ_ONLY_EVIDENCE',
      copy: 'PAST_PRESERVED — historical interfaces, releases, dashboards, visual donors and failed experiments remain immutable evidence. They can donate capabilities and interaction patterns, never inherited authority or fake telemetry.'
    }),
    present: Object.freeze({
      label: 'PRESENT_PROVEN',
      sourceId: 'truth://8x8/one-fabric/present',
      truthState: 'VERIFIED_IMPLEMENTED_SOURCE_POLICY',
      privacyClass: 'HORIZON_DEPENDENT',
      authorityState: 'SOURCE_POLICY_ONLY',
      copy: 'PRESENT_PROVEN — this atlas renders the current source policy for 8086, 8080 and 8888. Port reachability, health, authentication and runtime productivity remain UNKNOWN until separately observed and receipted.'
    }),
    future: Object.freeze({
      label: 'FUTURE_GATED',
      sourceId: 'truth://8x8/one-fabric/future',
      truthState: 'PLANNED_GATED',
      privacyClass: 'POLICY_BOUND',
      authorityState: 'NO_EXECUTION_AUTHORITY',
      copy: 'FUTURE_GATED — promotion, public release, deeper capabilities, 3D/XR and increments 002–100 require their own exact-source tests, receipts, privacy/authority gates and owner acceptance.'
    })
  }),
  horizons: Object.freeze([
    Object.freeze({
      id: 'lab', port: 8086, short: 'LAB', name: 'Experiment / Developer Integration',
      sourceId: 'horizon://8x8/8086',
      sourceRef: 'config/ONE_FABRIC_THREE_HORIZON_INTERFACE_TOPOLOGY_V3.json#horizons.lab_experiment_dev',
      truthState: 'VERIFIED_IMPLEMENTED_SOURCE_POLICY',
      privacyClass: 'OWNER_PRIVATE_OR_EXPLICIT_DEV',
      authorityState: 'NO_8888_RELEASE_AUTHORITY',
      runtimeEvidence: 'UNKNOWN_NOT_PROBED_BY_THIS_FEATURE',
      audience: 'OWNER_ROOT · explicitly authorized developer',
      purpose: 'Harvest, reconcile and exercise powers from historical interfaces, dashboards, dormant donors and new prototypes before private promotion.',
      capabilityPolicy: 'Broad source intake with truth, risk and authority gates',
      publicExposure: 'NOT ALLOWED', releaseAuthority: 'NO',
      boundary: '8086 can experiment broadly, but cannot publish 8888 directly. A candidate must be reconciled, tested and promoted through 8080 owner review.'
    }),
    Object.freeze({
      id: 'owner', port: 8080, short: 'OWNER', name: 'Private Dev / Control Horizon',
      sourceId: 'horizon://8x8/8080',
      sourceRef: 'config/ONE_FABRIC_THREE_HORIZON_INTERFACE_TOPOLOGY_V3.json#horizons.owner_private_control',
      truthState: 'VERIFIED_IMPLEMENTED_SOURCE_POLICY',
      privacyClass: 'OWNER_PRIVATE',
      authorityState: 'SOLE_8888_RELEASE_ORIGIN_BY_POLICY',
      runtimeEvidence: 'UNKNOWN_NOT_PROBED_BY_THIS_FEATURE',
      audience: 'OWNER_ROOT',
      purpose: 'The fullest stable private owner interface: verified One-Fabric powers, developer tools, evidence, private connectors, governance, promotion and rollback control.',
      capabilityPolicy: 'Superset of verified 8086 capabilities plus owner-only control planes',
      publicExposure: 'NEVER BY DEFAULT', releaseAuthority: 'YES — SOLE RELEASE ORIGIN',
      boundary: '8080 remains private control, never an arbitrary public backend. Every 8888 release needs a versioned feature/route allowlist, tenant scope, negative-authorization tests, receipt and rollback target.'
    }),
    Object.freeze({
      id: 'public', port: 8888, short: 'PUBLIC', name: 'Public / Tenant Product Horizon',
      sourceId: 'horizon://8x8/8888',
      sourceRef: 'config/ONE_FABRIC_THREE_HORIZON_INTERFACE_TOPOLOGY_V3.json#horizons.public_tenant_product',
      truthState: 'VERIFIED_IMPLEMENTED_SOURCE_POLICY',
      privacyClass: 'PUBLIC_OR_TENANT_SCOPED_AFTER_RELEASE_GATE',
      authorityState: 'CONSUMES_8080_RELEASE_MANIFEST',
      runtimeEvidence: 'UNKNOWN_NOT_PROBED_BY_THIS_FEATURE',
      audience: 'PUBLIC · authenticated tenant user',
      purpose: 'A curated public projection containing only capabilities explicitly promoted from 8080 and proven public-safe and tenant-safe.',
      capabilityPolicy: 'Strict subset of the 8080 public release manifest',
      publicExposure: 'ONLY AFTER EXPLICIT RELEASE GATE', releaseAuthority: 'NO — CONSUMES 8080 MANIFEST',
      boundary: '8888 cannot import owner routes, proxy arbitrary 8080 controls, serve private memory/source trees, expose raw runtime logs, or provide filesystem/process control.'
    })
  ])
});
