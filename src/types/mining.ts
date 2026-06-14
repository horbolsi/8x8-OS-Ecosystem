/**
 * Mining Network Intelligence - Database Schema
 * Stores networks, profitability, and user assignments
 */

export const miningTables = `
-- Mining networks with profitability data
CREATE TABLE IF NOT EXISTS mining_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  current_profitability NUMERIC(18, 6) DEFAULT 0,
  profitability_unit TEXT DEFAULT 'USD/day per TH/s',
  pool_url TEXT,
  pool_fee_percent NUMERIC(5, 2) DEFAULT 1.0,
  api_endpoint TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User mining assignments
CREATE TABLE IF NOT EXISTS user_mining_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  network_id UUID REFERENCES mining_networks(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  device_hashrate NUMERIC(18, 2) DEFAULT 0,
  power_wattage NUMERIC(10, 2) DEFAULT 0,
  manually_chosen BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, network_id)
);

-- Profitability history for analytics
CREATE TABLE IF NOT EXISTS profitability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID REFERENCES mining_networks(id),
  profitability NUMERIC(18, 6),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_mining_networks_profitability 
  ON mining_networks(current_profitability DESC);
CREATE INDEX IF NOT EXISTS idx_user_assignments_user 
  ON user_mining_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_profitability_history_network 
  ON profitability_history(network_id, recorded_at DESC);
`;