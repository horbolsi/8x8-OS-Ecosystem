export const FEATURE_001 = Object.freeze({
  id: '001',
  slug: 'three-horizon-fabric-atlas',
  name: 'Three-Horizon Fabric Atlas',
  canonicalRoot: 'fabric://8x8/core',
  sourcePolicy: 'config/ONE_FABRIC_THREE_HORIZON_INTERFACE_TOPOLOGY_V3.json',
  state: 'SOURCE_CANDIDATE_RUNTIME_UNCLAIMED',
  realities: Object.freeze({
    past: 'PAST_PRESERVED — historical interfaces, releases, dashboards, visual donors and failed experiments remain immutable evidence. They can donate capabilities and interaction patterns, never inherited authority or fake telemetry.',
    present: 'PRESENT_PROVEN — this atlas renders the current source policy for 8086, 8080 and 8888. Port reachability, health, authentication and runtime productivity remain UNKNOWN until separately observed and receipted.',
    future: 'FUTURE_GATED — promotion, public release, deeper capabilities, 3D/XR and increments 002–100 require their own exact-source tests, receipts, privacy/authority gates and owner acceptance.'
  }),
  horizons: Object.freeze([
    Object.freeze({
      id: 'lab', port: 8086, short: 'LAB', name: 'Experiment / Developer Integration',
      audience: 'OWNER_ROOT · explicitly authorized developer',
      purpose: 'Harvest, reconcile and exercise powers from historical interfaces, dashboards, dormant donors and new prototypes before private promotion.',
      capabilityPolicy: 'Broad source intake with truth, risk and authority gates',
      publicExposure: 'NOT ALLOWED', releaseAuthority: 'NO',
      boundary: '8086 can experiment broadly, but cannot publish 8888 directly. A candidate must be reconciled, tested and promoted through 8080 owner review.'
    }),
    Object.freeze({
      id: 'owner', port: 8080, short: 'OWNER', name: 'Private Dev / Control Horizon',
      audience: 'OWNER_ROOT',
      purpose: 'The fullest stable private owner interface: verified One-Fabric powers, developer tools, evidence, private connectors, governance, promotion and rollback control.',
      capabilityPolicy: 'Superset of verified 8086 capabilities plus owner-only control planes',
      publicExposure: 'NEVER BY DEFAULT', releaseAuthority: 'YES — SOLE RELEASE ORIGIN',
      boundary: '8080 remains private control, never an arbitrary public backend. Every 8888 release needs a versioned feature/route allowlist, tenant scope, negative-authorization tests, receipt and rollback target.'
    }),
    Object.freeze({
      id: 'public', port: 8888, short: 'PUBLIC', name: 'Public / Tenant Product Horizon',
      audience: 'PUBLIC · authenticated tenant user',
      purpose: 'A curated public projection containing only capabilities explicitly promoted from 8080 and proven public-safe and tenant-safe.',
      capabilityPolicy: 'Strict subset of the 8080 public release manifest',
      publicExposure: 'ONLY AFTER EXPLICIT RELEASE GATE', releaseAuthority: 'NO — CONSUMES 8080 MANIFEST',
      boundary: '8888 cannot import owner routes, proxy arbitrary 8080 controls, serve private memory/source trees, expose raw runtime logs, or provide filesystem/process control.'
    })
  ])
});
