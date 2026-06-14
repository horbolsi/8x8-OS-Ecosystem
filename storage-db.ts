import pg from 'pg';
import { getDatabaseUrl } from './db-utils.js';

const { Pool } = pg;

const databaseUrl = getDatabaseUrl();
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

function requirePool() {
  if (!pool) throw new Error('DATABASE_URL not configured');
  return pool;
}

// shared/schema.ts uses camelCase identifiers.
// This adapter matches those names in table/column generation.
// Types are "any" in shared/schema, so we use runtime-safe SQL building.

type Row = Record<string, any>;

function tableName(tableRef: any): string {
  return String(tableRef?.__name__ || '');
}

function columnName(colRef: any): string {
  return String(colRef?.__field__ || '');
}

function toWherePred(cond: any): ((row: Row) => boolean) | null {
  // Not used in SQL-backed mode.
  if (cond && typeof cond === 'object' && cond.__pred__) return null;
  return null;
}

function eqToWhere(cond: any): { col: string; val: any } | null {
  // Our mock eq() encodes only __pred__. So we can’t extract column/value.
  // Therefore storage-db currently uses a different approach: we override
  // server/db.ts with real SQL builder that supports eq() directly.
  // This file is kept as scaffolding only.
  return null;
}

export async function initStorageTables(): Promise<void> {
  if (!databaseUrl) return;

  const p = requirePool();
  // We create minimal schemas that accept JSON blobs for flexible fields.
  // This keeps compatibility with the current "any" typed schema.
  //
  // Note: columns are inferred from shared/schema.ts field list.

  const statements: string[] = [
    `CREATE TABLE IF NOT EXISTS bubbles (
      id TEXT PRIMARY KEY,
      name TEXT,
      icon TEXT,
      color TEXT,
      x INTEGER,
      y INTEGER,
      width INTEGER,
      height INTEGER,
      isOpen BOOLEAN,
      isPinned BOOLEAN
    );`,

    `CREATE TABLE IF NOT EXISTS detectedUrls (
      id SERIAL PRIMARY KEY,
      url TEXT,
      title TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      content TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS blockchainTransactions (
      id SERIAL PRIMARY KEY,
      txHash TEXT,
      fromAddress TEXT,
      toAddress TEXT,
      amount NUMERIC,
      token TEXT,
      type TEXT,
      status TEXT,
      blockNumber BIGINT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB
    );`,

    `CREATE TABLE IF NOT EXISTS nfts (
      id SERIAL PRIMARY KEY,
      tokenId TEXT UNIQUE,
      name TEXT,
      rarity TEXT,
      ownerAddress TEXT,
      power INTEGER,
      assets JSONB,
      lockedAmount NUMERIC,
      mintedAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS walletAddresses (
      id SERIAL PRIMARY KEY,
      address TEXT UNIQUE,
      label TEXT,
      network TEXT,
      isActive BOOLEAN DEFAULT TRUE,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS stakingPools (
      id SERIAL PRIMARY KEY,
      ownerAddress TEXT,
      token TEXT,
      stakedAmount NUMERIC,
      rewardRate NUMERIC,
      startedAt TIMESTAMPTZ DEFAULT NOW(),
      lastClaimed TIMESTAMPTZ,
      poolType TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS socialPosts (
      id SERIAL PRIMARY KEY,
      authorAddress TEXT,
      content TEXT,
      likes INTEGER DEFAULT 0,
      platform TEXT,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      username TEXT,
      walletAddress TEXT UNIQUE,
      score NUMERIC DEFAULT 0,
      rank INTEGER,
      badges JSONB,
      tier TEXT,
      updatedAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS governanceProposals (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      options JSONB,
      votes JSONB,
      status TEXT,
      authorAddress TEXT,
      endDate TIMESTAMPTZ,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      referrerCode TEXT,
      referredAddress TEXT,
      reward NUMERIC,
      status TEXT,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS activityFeed (
      id SERIAL PRIMARY KEY,
      type TEXT,
      description TEXT,
      address TEXT,
      amount NUMERIC,
      token TEXT,
      txHash TEXT,
      metadata JSONB,
      createdAt TIMESTAMPTZ DEFAULT NOW()
    );`,
  ];

  for (const sql of statements) {
    await p.query(sql);
  }
}

