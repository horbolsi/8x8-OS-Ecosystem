import pg from 'pg';

const { Pool } = pg;
const CANONICAL_ROOT = 'fabric://8x8/core';
const CANONICAL_SOURCE_HEAD = 'ef81863843315605aae458297b7d60367545d3e5';
const DATABASE_ENV_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'NEON_DATABASE_URL',
];

const databaseEnvName = DATABASE_ENV_CANDIDATES.find((name) => {
  const value = process.env[name];
  return typeof value === 'string' && /^(postgres|postgresql):\/\//i.test(value);
}) || null;
const databaseUrl = databaseEnvName ? process.env[databaseEnvName] : null;
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    })
  : null;

function setHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-8X8-Canonical-Root', CANONICAL_ROOT);
  res.setHeader('X-8X8-Carrier-Authority', 'READ_ONLY_PROBE');
}

export default async function handler(req, res) {
  setHeaders(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  if (!pool) {
    return res.status(503).json({
      state: 'BLOCKED_DATABASE_BINDING_NOT_CONFIGURED',
      canonical_root: CANONICAL_ROOT,
      canonical_source_head: CANONICAL_SOURCE_HEAD,
      approved_database_env_candidates_checked: DATABASE_ENV_CANDIDATES,
      configured_candidate_count: 0,
      credential_value_returned: false,
      write_authority: false,
    });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS connected_role,
        to_regclass('public.genesis_reservation_staging')::text AS genesis_table,
        to_regclass('public.free_daily_minutes_usage_staging')::text AS minutes_table,
        CASE WHEN to_regclass('public.genesis_reservation_staging') IS NULL
          THEN NULL ELSE (SELECT count(*)::bigint FROM public.genesis_reservation_staging) END AS genesis_rows,
        CASE WHEN to_regclass('public.free_daily_minutes_usage_staging') IS NULL
          THEN NULL ELSE (SELECT count(*)::bigint FROM public.free_daily_minutes_usage_staging) END AS minutes_rows,
        (SELECT count(*)::bigint
           FROM information_schema.role_table_grants
          WHERE table_schema='public'
            AND table_name='genesis_reservation_staging'
            AND grantee IN ('authenticated','PUBLIC')) AS genesis_generic_privileges,
        (SELECT count(*)::bigint
           FROM information_schema.role_table_grants
          WHERE table_schema='public'
            AND table_name='free_daily_minutes_usage_staging'
            AND grantee IN ('authenticated','PUBLIC')) AS minutes_generic_privileges
    `);
    const row = rows[0] || {};
    const ready = row.genesis_table === 'genesis_reservation_staging'
      && row.minutes_table === 'free_daily_minutes_usage_staging'
      && Number(row.genesis_generic_privileges) === 0
      && Number(row.minutes_generic_privileges) === 0;

    return res.status(ready ? 200 : 503).json({
      state: ready ? 'PRESENT_PROVEN_GENESIS_LEDGER_CARRIER_REACHABLE' : 'DEGRADED_GENESIS_LEDGER_CARRIER',
      canonical_root: CANONICAL_ROOT,
      canonical_source_head: CANONICAL_SOURCE_HEAD,
      adapter: '8x8-OS-Ecosystem/Vercel read-only carrier probe',
      database_binding_name: databaseEnvName,
      credential_value_returned: false,
      database_name: row.database_name ?? null,
      connected_role: row.connected_role ?? null,
      genesis_table: row.genesis_table ?? null,
      minutes_table: row.minutes_table ?? null,
      genesis_rows: row.genesis_rows == null ? null : Number(row.genesis_rows),
      minutes_rows: row.minutes_rows == null ? null : Number(row.minutes_rows),
      genesis_generic_privileges: Number(row.genesis_generic_privileges ?? -1),
      minutes_generic_privileges: Number(row.minutes_generic_privileges ?? -1),
      customer_rows_returned: false,
      reservation_write_authority: false,
      financial_effect: false,
      signing: false,
      mainnet: false,
      mint: false,
      airdrop: false,
      funded_liquidity: false,
    });
  } catch (error) {
    console.error('[8x8-genesis-health] read-only probe failed', error?.message || error);
    return res.status(503).json({
      state: 'BLOCKED_GENESIS_LEDGER_CARRIER_QUERY_FAILED',
      canonical_root: CANONICAL_ROOT,
      canonical_source_head: CANONICAL_SOURCE_HEAD,
      database_binding_name: databaseEnvName,
      credential_value_returned: false,
      write_authority: false,
      detail: String(error?.code || error?.name || 'QUERY_FAILED'),
    });
  }
}
