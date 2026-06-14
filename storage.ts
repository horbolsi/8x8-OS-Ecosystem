import { db } from "./db";
import {
  bubbles, detectedUrls, notes, blockchainTransactions, nfts, walletAddresses, stakingPools, socialPosts, leaderboard,
  governanceProposals, referrals, activityFeed,
  type Bubble, type InsertBubble,
  type DetectedUrl, type InsertUrl,
  type Note, type InsertNote,
  type BlockchainTransaction, type InsertTransaction,
  type NFT, type InsertNFT,
  type WalletAddress, type InsertWalletAddress,
  type StakingPool, type InsertStakingPool,
  type SocialPost, type InsertSocialPost,
  type LeaderboardEntry, type InsertLeaderboardEntry,
  type GovernanceProposal, type InsertGovernanceProposal,
  type Referral, type InsertReferral,
  type ActivityEntry, type InsertActivity,
} from "@shared/schema";
import { eq, asc, desc } from "./db";
import { R2Storage, createR2Storage, getR2Storage } from "./storage/r2-storage.js";

export { R2Storage, createR2Storage, getR2Storage };
export type { UploadResult, FileInfo, R2Config } from "./storage/r2-storage.js";

export interface IStorage {
  getBubbles(): Promise<Bubble[]>;
  getBubble(id: string): Promise<Bubble | undefined>;
  createBubble(bubble: InsertBubble): Promise<Bubble>;
  updateBubble(id: string, updates: Partial<InsertBubble>): Promise<Bubble>;
  initBubbles(defaultBubbles: InsertBubble[]): Promise<Bubble[]>;

  getUrls(): Promise<DetectedUrl[]>;
  createUrl(url: InsertUrl): Promise<DetectedUrl>;

  getNotes(): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  getTransactions(limit?: number): Promise<BlockchainTransaction[]>;
  createTransaction(tx: InsertTransaction): Promise<BlockchainTransaction>;

  getNFTs(ownerAddress?: string): Promise<NFT[]>;
  getNFT(tokenId: string): Promise<NFT | undefined>;
  createNFT(nft: InsertNFT): Promise<NFT>;
  updateNFT(tokenId: string, updates: Partial<InsertNFT>): Promise<NFT>;
  getNFTCount(): Promise<number>;

  getWalletAddresses(): Promise<WalletAddress[]>;
  createWalletAddress(addr: InsertWalletAddress): Promise<WalletAddress>;
  updateWalletAddress(id: number, updates: Partial<InsertWalletAddress>): Promise<WalletAddress>;
  deleteWalletAddress(id: number): Promise<void>;

  getStakingPools(ownerAddress?: string): Promise<StakingPool[]>;
  createStakingPool(pool: InsertStakingPool): Promise<StakingPool>;
  updateStakingPool(id: number, updates: Partial<InsertStakingPool>): Promise<StakingPool>;

  getSocialPosts(): Promise<SocialPost[]>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  updateSocialPost(id: number, updates: Partial<InsertSocialPost>): Promise<SocialPost>;
  deleteSocialPost(id: number): Promise<void>;

  getLeaderboard(): Promise<LeaderboardEntry[]>;
  upsertLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;

  getGovernanceProposals(): Promise<GovernanceProposal[]>;
  createGovernanceProposal(p: InsertGovernanceProposal): Promise<GovernanceProposal>;
  voteOnProposal(id: number, optionIndex: number): Promise<GovernanceProposal>;

  getReferrals(referrerCode?: string): Promise<Referral[]>;
  createReferral(ref: InsertReferral): Promise<Referral>;

  getActivityFeed(limit?: number): Promise<ActivityEntry[]>;
  createActivity(activity: InsertActivity): Promise<ActivityEntry>;
}

export class DatabaseStorage implements IStorage {
  async getBubbles(): Promise<Bubble[]> {
    return await db.select().from(bubbles).orderBy(asc(bubbles.id));
  }
  async getBubble(id: string): Promise<Bubble | undefined> {
    const [bubble] = await db.select().from(bubbles).where(eq(bubbles.id, id));
    return bubble;
  }
  async createBubble(bubble: InsertBubble): Promise<Bubble> {
    const [newBubble] = await db.insert(bubbles).values(bubble).returning();
    return newBubble;
  }
  async updateBubble(id: string, updates: Partial<InsertBubble>): Promise<Bubble> {
    const [updated] = await db.update(bubbles).set(updates).where(eq(bubbles.id, id)).returning();
    return updated;
  }
  async initBubbles(defaultBubbles: InsertBubble[]): Promise<Bubble[]> {
    const existing = await this.getBubbles();
    const existingIds = new Set(existing.map(b => b.id));
    const toInsert = defaultBubbles.filter(b => !existingIds.has(b.id));
    if (toInsert.length > 0) {
      await db.insert(bubbles).values(toInsert);
    }
    return await this.getBubbles();
  }

  async getUrls(): Promise<DetectedUrl[]> {
    return await db.select().from(detectedUrls).orderBy(desc(detectedUrls.timestamp));
  }
  async createUrl(url: InsertUrl): Promise<DetectedUrl> {
    const [newUrl] = await db.insert(detectedUrls).values(url).returning();
    return newUrl;
  }

  async getNotes(): Promise<Note[]> {
    return await db.select().from(notes).orderBy(desc(notes.timestamp));
  }
  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }
  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async getTransactions(limit = 50): Promise<BlockchainTransaction[]> {
    return await db.select().from(blockchainTransactions).orderBy(desc(blockchainTransactions.timestamp)).limit(limit);
  }
  async createTransaction(tx: InsertTransaction): Promise<BlockchainTransaction> {
    const [newTx] = await db.insert(blockchainTransactions).values(tx).returning();
    return newTx;
  }

  async getNFTs(ownerAddress?: string): Promise<NFT[]> {
    if (ownerAddress) {
      return await db.select().from(nfts).where(eq(nfts.ownerAddress, ownerAddress)).orderBy(desc(nfts.mintedAt));
    }
    return await db.select().from(nfts).orderBy(desc(nfts.mintedAt));
  }
  async getNFT(tokenId: string): Promise<NFT | undefined> {
    const [nft] = await db.select().from(nfts).where(eq(nfts.tokenId, tokenId));
    return nft;
  }
  async createNFT(nft: InsertNFT): Promise<NFT> {
    const [newNft] = await db.insert(nfts).values(nft).returning();
    return newNft;
  }
  async updateNFT(tokenId: string, updates: Partial<InsertNFT>): Promise<NFT> {
    const [updated] = await db.update(nfts).set(updates).where(eq(nfts.tokenId, tokenId)).returning();
    return updated;
  }
  async getNFTCount(): Promise<number> {
    const all = await db.select().from(nfts);
    return all.length;
  }

  async getWalletAddresses(): Promise<WalletAddress[]> {
    return await db.select().from(walletAddresses).where(eq(walletAddresses.isActive, true));
  }
  async createWalletAddress(addr: InsertWalletAddress): Promise<WalletAddress> {
    const [newAddr] = await db.insert(walletAddresses).values(addr).returning();
    return newAddr;
  }
  async updateWalletAddress(id: number, updates: Partial<InsertWalletAddress>): Promise<WalletAddress> {
    const [updated] = await db.update(walletAddresses).set(updates).where(eq(walletAddresses.id, id)).returning();
    return updated;
  }
  async deleteWalletAddress(id: number): Promise<void> {
    await db.update(walletAddresses).set({ isActive: false }).where(eq(walletAddresses.id, id));
  }

  async getStakingPools(ownerAddress?: string): Promise<StakingPool[]> {
    if (ownerAddress) {
      return await db.select().from(stakingPools).where(eq(stakingPools.ownerAddress, ownerAddress));
    }
    return await db.select().from(stakingPools).orderBy(desc(stakingPools.startedAt));
  }
  async createStakingPool(pool: InsertStakingPool): Promise<StakingPool> {
    const [newPool] = await db.insert(stakingPools).values(pool).returning();
    return newPool;
  }
  async updateStakingPool(id: number, updates: Partial<InsertStakingPool>): Promise<StakingPool> {
    const [updated] = await db.update(stakingPools).set(updates).where(eq(stakingPools.id, id)).returning();
    return updated;
  }

  async getSocialPosts(): Promise<SocialPost[]> {
    return await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));
  }
  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> {
    const [newPost] = await db.insert(socialPosts).values(post).returning();
    return newPost;
  }
  async updateSocialPost(id: number, updates: Partial<InsertSocialPost>): Promise<SocialPost> {
    const [updated] = await db.update(socialPosts).set(updates).where(eq(socialPosts.id, id)).returning();
    return updated;
  }
  async deleteSocialPost(id: number): Promise<void> {
    await db.delete(socialPosts).where(eq(socialPosts.id, id));
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return await db.select().from(leaderboard).orderBy(desc(leaderboard.score));
  }
  async upsertLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const existing = entry.walletAddress
      ? await db.select().from(leaderboard).where(eq(leaderboard.walletAddress, entry.walletAddress))
      : [];
    if (existing.length > 0) {
      const [updated] = await db.update(leaderboard).set({ ...entry, updatedAt: new Date() }).where(eq(leaderboard.id, existing[0].id)).returning();
      return updated;
    }
    const [newEntry] = await db.insert(leaderboard).values(entry).returning();
    return newEntry;
  }

  async getGovernanceProposals(): Promise<GovernanceProposal[]> {
    return await db.select().from(governanceProposals).orderBy(desc(governanceProposals.createdAt));
  }
  async createGovernanceProposal(p: InsertGovernanceProposal): Promise<GovernanceProposal> {
    const [newP] = await db.insert(governanceProposals).values(p).returning();
    return newP;
  }
  async voteOnProposal(id: number, optionIndex: number): Promise<GovernanceProposal> {
    const [existing] = await db.select().from(governanceProposals).where(eq(governanceProposals.id, id));
    if (!existing) throw new Error("Proposal not found");
    const newVotes = [...(existing.votes || [])];
    newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
    const [updated] = await db.update(governanceProposals).set({ votes: newVotes }).where(eq(governanceProposals.id, id)).returning();
    return updated;
  }

  async getReferrals(referrerCode?: string): Promise<Referral[]> {
    if (referrerCode) {
      return await db.select().from(referrals).where(eq(referrals.referrerCode, referrerCode));
    }
    return await db.select().from(referrals).orderBy(desc(referrals.createdAt));
  }
  async createReferral(ref: InsertReferral): Promise<Referral> {
    const [newRef] = await db.insert(referrals).values(ref).returning();
    return newRef;
  }

  async getActivityFeed(limit = 50): Promise<ActivityEntry[]> {
    return await db.select().from(activityFeed).orderBy(desc(activityFeed.createdAt)).limit(limit);
  }
  async createActivity(activity: InsertActivity): Promise<ActivityEntry> {
    const [newActivity] = await db.insert(activityFeed).values(activity).returning();
    return newActivity;
  }
}

// Storage type configuration
export type StorageType = "local" | "r2" | "memory";

export interface StorageConfig {
  type: StorageType;
  r2?: ReturnType<typeof createR2Storage>;
}

let storageConfig: StorageConfig = {
  type: (process.env.STORAGE_TYPE as StorageType) || "local",
};

let r2Storage: R2Storage | null = null;

export function configureStorage(config: StorageConfig): void {
  storageConfig = config;
  if (config.type === "r2" && config.r2) {
    r2Storage = config.r2;
  }
}

export function getStorageConfig(): StorageConfig {
  return storageConfig;
}

// Get R2 storage instance (auto-initializes from env if type is r2)
export function getFileStorage(): R2Storage | null {
  if (storageConfig.type === "r2") {
    if (!r2Storage) {
      r2Storage = getR2Storage();
    }
    return r2Storage;
  }
  return null;
}

// Initialize storage based on environment
export function initializeStorage(): void {
  const storageType = (process.env.STORAGE_TYPE as StorageType) || "local";
  
  if (storageType === "r2") {
    const r2 = createR2Storage();
    if (r2) {
      configureStorage({ type: "r2", r2 });
      console.log("✅ Storage initialized: Cloudflare R2");
    } else {
      console.warn("⚠️ R2 storage configured but not available. Falling back to local.");
      configureStorage({ type: "local" });
    }
  } else {
    configureStorage({ type: "local" });
    console.log("✅ Storage initialized: Local filesystem");
  }
}

export const storage = new DatabaseStorage();
