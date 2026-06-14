/**
 * 8x8 Hub - Database Schema
 * Complete PostgreSQL schema with Drizzle ORM
 */

import { pgTable, pgEnum, text, timestamp, boolean, integer, bigint, jsonb, uuid, serial, varchar, decimal } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'moderator', 'user', 'guest']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'monthly', 'quarterly', 'yearly', 'lifetime']);
export const transactionTypeEnum = pgEnum('transaction_type', ['deposit', 'withdrawal', 'transfer', 'staking', 'reward', 'fee']);
export const nftStatusEnum = pgEnum('nft_status', ['minting', 'active', 'staked', 'burned']);
export const proposalStatusEnum = pgEnum('proposal_status', ['draft', 'active', 'passed', 'rejected', 'executed']);
export const eventStatusEnum = pgEnum('event_status', ['upcoming', 'active', 'completed', 'cancelled']);

// Users Table
export const users = pgTable('hub_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegramId: varchar('telegram_id', { length: 50 }).unique(),
  username: varchar('username', { length: 100 }),
  displayName: varchar('display_name', { length: 255 }),
  email: varchar('email', { length: 255 }).unique(),
  avatar: text('avatar'),
  role: userRoleEnum('role').default('user'),
  plan: subscriptionPlanEnum('plan').default('free'),
  planExpiresAt: timestamp('plan_expires_at'),
  dailyMinutesUsed: integer('daily_minutes_used').default(0),
  dailyMinutesLimit: integer('daily_minutes_limit').default(10),
  totalAiMinutes: integer('total_ai_minutes').default(0),
  points: integer('points').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
});

// Sessions Table
export const sessions = pgTable('hub_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 128 }).unique().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  permissions: jsonb('permissions').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  isValid: boolean('is_valid').default(true),
});

// Wallets Table
export const wallets = pgTable('hub_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  chain: varchar('chain', { length: 50 }).notNull(), // ethereum, solana, etc.
  address: varchar('address', { length: 255 }).notNull(),
  label: varchar('label', { length: 100 }),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Token Balances Table
export const tokenBalances = pgTable('hub_token_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenSymbol: varchar('token_symbol', { length: 20 }).notNull(),
  chain: varchar('chain', { length: 50 }).notNull(),
  balance: decimal('balance', { precision: 36, scale: 18 }).default('0'),
  lockedBalance: decimal('locked_balance', { precision: 36, scale: 18 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Staking Table
export const staking = pgTable('hub_staking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  amount: decimal('amount', { precision: 36, scale: 18 }).notNull(),
  lockPeriod: integer('lock_period').notNull(), // in days
  startTime: timestamp('start_time').defaultNow(),
  endTime: timestamp('end_time').notNull(),
  rewards: decimal('rewards', { precision: 36, scale: 18 }).default('0'),
  claimedRewards: decimal('claimed_rewards', { precision: 36, scale: 18 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// NFTs Table
export const nfts = pgTable('hub_nfts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenId: varchar('token_id', { length: 100 }).notNull(),
  collection: varchar('collection', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  description: text('description'),
  imageUrl: text('image_url'),
  attributes: jsonb('attributes').default({}),
  status: nftStatusEnum('status').default('active'),
  mintedAt: timestamp('minted_at').defaultNow(),
});

// Transactions Table
export const transactions = pgTable('hub_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: transactionTypeEnum('type').notNull(),
  tokenSymbol: varchar('token_symbol', { length: 20 }),
  amount: decimal('amount', { precision: 36, scale: 18 }),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddress: varchar('to_address', { length: 255 }),
  txHash: varchar('tx_hash', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Governance Proposals Table
export const proposals = pgTable('hub_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  status: proposalStatusEnum('status').default('draft'),
  forVotes: decimal('for_votes', { precision: 36, scale: 18 }).default('0'),
  againstVotes: decimal('against_votes', { precision: 36, scale: 18 }).default('0'),
  quorumRequired: decimal('quorum_required', { precision: 36, scale: 18 }).default('1000000'),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  executionData: jsonb('execution_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Votes Table
export const votes = pgTable('hub_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => proposals.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  support: boolean('support').notNull(), // true = for, false = against
  votingPower: decimal('voting_power', { precision: 36, scale: 18 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Activity Feed Table
export const activityFeed = pgTable('hub_activity_feed', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  points: integer('points').default(0),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// Leaderboard Table
export const leaderboard = pgTable('hub_leaderboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull().unique(),
  rank: integer('rank').notNull(),
  totalPoints: integer('total_points').default(0),
  weeklyPoints: integer('weekly_points').default(0),
  monthlyPoints: integer('monthly_points').default(0),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Referrals Table
export const referrals = pgTable('hub_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').references(() => users.id).notNull(),
  referredId: uuid('referred_id').references(() => users.id).notNull(),
  rewardClaimed: boolean('reward_claimed').default(false),
  rewardAmount: decimal('reward_amount', { precision: 36, scale: 18 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Events Table
export const events = pgTable('hub_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  status: eventStatusEnum('status').default('upcoming'),
  metadata: jsonb('metadata').default({}),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Settings Table
export const settings = pgTable('hub_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: text('value'),
  type: varchar('type', { length: 20 }).default('string'),
  category: varchar('category', { length: 50 }),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Contributors Table (for admin bot)
export const contributors = pgTable('hub_contributors', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  telegramId: varchar('telegram_id', { length: 50 }).notNull(),
  role: varchar('role', { length: 50 }).default('contributor'),
  contributions: jsonb('contributions').default([]),
  addedBy: uuid('added_by').references(() => users.id),
  addedAt: timestamp('added_at').defaultNow(),
  isActive: boolean('is_active').default(true),
});

// Usage Tracking Table
export const usageTracking = pgTable('hub_usage_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  feature: varchar('feature', { length: 50 }).notNull(),
  count: integer('count').default(1),
  date: timestamp('date').defaultNow(),
});

// Security Events Table
export const securityEvents = pgTable('hub_security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).default('low'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  details: jsonb('details').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

// API Keys Table
export const apiKeys = pgTable('hub_api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  key: varchar('key', { length: 64 }).unique().notNull(),
  permissions: jsonb('permissions').default([]),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type TokenBalance = typeof tokenBalances.$inferSelect;
export type StakingPosition = typeof staking.$inferSelect;
export type NFT = typeof nfts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Vote = typeof votes.$inferSelect;
export type Activity = typeof activityFeed.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Contributor = typeof contributors.$inferSelect;
export type SecurityEvent = typeof securityEvents.$inferSelect;
