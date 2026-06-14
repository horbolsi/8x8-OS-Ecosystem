import { z } from 'zod';

// ── Table proxy factory ──────────────────────────────────────────────────────
// Each table is an object with __name__ and column field refs.
function makeTable(name: string, fields: string[]): any {
  const table: any = { __name__: name };
  for (const f of fields) {
    table[f] = { __field__: f };
  }
  return table;
}

// ── Tables ────────────────────────────────────────────────────────────────────
export const bubbles = makeTable('bubbles', ['id', 'name', 'icon', 'color', 'x', 'y', 'width', 'height', 'isOpen', 'isPinned']);
export const detectedUrls = makeTable('detectedUrls', ['id', 'url', 'title', 'timestamp']);
export const notes = makeTable('notes', ['id', 'content', 'timestamp']);
export const blockchainTransactions = makeTable('blockchainTransactions', ['id', 'txHash', 'fromAddress', 'toAddress', 'amount', 'token', 'type', 'status', 'blockNumber', 'timestamp', 'metadata']);
export const nfts = makeTable('nfts', ['id', 'tokenId', 'name', 'rarity', 'ownerAddress', 'power', 'assets', 'lockedAmount', 'mintedAt']);
export const walletAddresses = makeTable('walletAddresses', ['id', 'address', 'label', 'network', 'isActive', 'createdAt']);
export const stakingPools = makeTable('stakingPools', ['id', 'ownerAddress', 'token', 'stakedAmount', 'rewardRate', 'startedAt', 'lastClaimed', 'poolType']);
export const socialPosts = makeTable('socialPosts', ['id', 'authorAddress', 'content', 'likes', 'platform', 'createdAt']);
export const leaderboard = makeTable('leaderboard', ['id', 'username', 'walletAddress', 'score', 'rank', 'badges', 'tier', 'updatedAt']);
export const governanceProposals = makeTable('governanceProposals', ['id', 'title', 'description', 'options', 'votes', 'status', 'authorAddress', 'endDate', 'createdAt']);
export const referrals = makeTable('referrals', ['id', 'referrerCode', 'referredAddress', 'reward', 'status', 'createdAt']);
export const activityFeed = makeTable('activityFeed', ['id', 'type', 'description', 'address', 'amount', 'token', 'txHash', 'metadata', 'createdAt']);

// Extras kept for compatibility
export const users = makeTable('users', ['id', 'address', 'username', 'createdAt']);
export const messages = makeTable('messages', ['id', 'content', 'role', 'createdAt']);
export const nftVaults = makeTable('nftVaults', ['id', 'tokenId', 'lockedAmount', 'owner', 'createdAt']);
export const trades = makeTable('trades', ['id', 'pair', 'side', 'amount', 'price', 'status', 'createdAt']);
export const conversations = makeTable('conversations', ['id', 'title', 'createdAt']);
export const chatMessages = makeTable('chatMessages', ['id', 'conversationId', 'role', 'content', 'createdAt']);

// ── Zod schemas ───────────────────────────────────────────────────────────────
export const insertBubbleSchema = z.object({});
export const insertUrlSchema = z.object({
  id: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  timestamp: z.number().optional(),
});
export const insertNoteSchema = z.object({});
export const insertTransactionSchema = z.object({});
export const insertNFTSchema = z.object({});
export const insertWalletAddressSchema = z.object({});
export const insertStakingPoolSchema = z.object({});
export const insertSocialPostSchema = z.object({});
export const insertLeaderboardEntrySchema = z.object({});
export const insertGovernanceProposalSchema = z.object({});
export const insertReferralSchema = z.object({});
export const insertActivitySchema = z.object({});
export const insertConversationSchema = z.object({});
export const insertMessageSchema = z.object({});

// ── Types ─────────────────────────────────────────────────────────────────────
export type Bubble = any;
export type InsertBubble = any;
export type DetectedUrl = any;
export type InsertUrl = any;
export type Note = any;
export type InsertNote = any;
export type BlockchainTransaction = any;
export type InsertTransaction = any;
export type NFT = any;
export type InsertNFT = any;
export type WalletAddress = any;
export type InsertWalletAddress = any;
export type StakingPool = any;
export type InsertStakingPool = any;
export type SocialPost = any;
export type InsertSocialPost = any;
export type LeaderboardEntry = any;
export type InsertLeaderboardEntry = any;
export type GovernanceProposal = any;
export type InsertGovernanceProposal = any;
export type Referral = any;
export type InsertReferral = any;
export type ActivityEntry = any;
export type InsertActivity = any;
