// ============================================================
// 8x8 Hub - Leaderboard Updater Service
// ============================================================
// Auto-updates leaderboard when: trades, games, stakes, referrals happen

import { storage } from "../../storage";
import { db } from "../../db";
import { leaderboard, activityFeed } from "@shared/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// WebSocket emitter for real-time updates
type BroadcastFn = (event: string, data: any) => void;
let broadcastFn: BroadcastFn | null = null;

export function setLeaderboardBroadcast(fn: BroadcastFn) {
  broadcastFn = fn;
}

// Points calculation formula (matches admin.ts)
function calculatePoints(data: {
  tradeVolume?: number;
  stakeAmount?: number;
  referralCount?: number;
  gamesWon?: number;
}): number {
  const tradePoints = data.tradeVolume ? Math.sqrt(data.tradeVolume) / 100 : 0;
  const stakePoints = data.stakeAmount ? data.stakeAmount * 0.01 : 0;
  const referralPoints = (data.referralCount || 0) * 1000;
  const gamePoints = (data.gamesWon || 0) * 500;
  return Math.floor(tradePoints + stakePoints + referralPoints + gamePoints);
}

// Update leaderboard entry for a user
async function updateLeaderboardEntry(
  walletAddress: string,
  username: string,
  category: 'trading' | 'gaming' | 'staking' | 'referral',
  scoreDelta: number
) {
  try {
    // Check if entry exists
    const existing = await db.select().from(leaderboard)
      .where(eq(leaderboard.walletAddress, walletAddress))
      .limit(1);

    if (existing.length > 0) {
      // Update existing entry
      const newScore = Math.max(0, (existing[0].score || 0) + scoreDelta);
      await db.update(leaderboard)
        .set({ 
          score: newScore,
          username: username || existing[0].username,
          updatedAt: new Date()
        })
        .where(eq(leaderboard.id, existing[0].id));
      
      return { id: existing[0].id, score: newScore, username };
    } else {
      // Create new entry
      const [newEntry] = await db.insert(leaderboard).values({
        walletAddress,
        username: username || 'Anonymous',
        score: scoreDelta,
        rank: 0,
        badges: [],
        tier: 'Bronze'
      }).returning();
      
      return newEntry;
    }
  } catch (error) {
    console.error('[LeaderboardUpdater] Error updating entry:', error);
    return null;
  }
}

// Log activity and emit to WebSocket
async function logActivity(
  walletAddress: string,
  username: string,
  category: 'trading' | 'gaming' | 'staking' | 'referral',
  detail: string,
  amount?: number
) {
  try {
    const activity = await db.insert(activityFeed).values({
      walletAddress,
      username,
      action: category,
      detail,
      amount: amount || 0,
      createdAt: new Date()
    }).returning();

    // Broadcast to WebSocket
    if (broadcastFn && activity[0]) {
      broadcastFn('activity:new', activity[0]);
      broadcastFn('leaderboard:update', { 
        category,
        walletAddress,
        timestamp: new Date().toISOString()
      });
    }

    return activity[0];
  } catch (error) {
    console.error('[LeaderboardUpdater] Error logging activity:', error);
    return null;
  }
}

// ── Trade Event Handler ──────────────────────────────────────
export async function onTradeExecuted(data: {
  walletAddress: string;
  username: string;
  tradeVolume: number;
  pair?: string;
}) {
  const points = calculatePoints({ tradeVolume: data.tradeVolume });
  
  await updateLeaderboardEntry(
    data.walletAddress,
    data.username,
    'trading',
    points
  );

  await logActivity(
    data.walletAddress,
    data.username,
    'trading',
    `Trade executed: ${data.pair || 'unknown pair'}`,
    data.tradeVolume
  );

  console.log(`[LeaderboardUpdater] Trade: ${data.username} +${points} points`);
}

// ── Game Event Handler ────────────────────────────────────────
export async function onGamePlayed(data: {
  walletAddress: string;
  username: string;
  gameType: string;
  won: boolean;
  score?: number;
}) {
  if (!data.won) return; // Only award points for wins

  const points = calculatePoints({ gamesWon: 1 });
  
  await updateLeaderboardEntry(
    data.walletAddress,
    data.username,
    'gaming',
    points
  );

  await logActivity(
    data.walletAddress,
    data.username,
    'gaming',
    `Won ${data.gameType}! Score: ${data.score || 0}`,
    points
  );

  console.log(`[LeaderboardUpdater] Game: ${data.username} won ${data.gameType} +${points} points`);
}

// ── Stake Deposit Handler ──────────────────────────────────────
export async function onStakeDeposited(data: {
  walletAddress: string;
  username: string;
  amount: number;
  poolId?: string;
}) {
  const points = calculatePoints({ stakeAmount: data.amount });
  
  await updateLeaderboardEntry(
    data.walletAddress,
    data.username,
    'staking',
    points
  );

  await logActivity(
    data.walletAddress,
    data.username,
    'staking',
    `Staked ${data.amount} into pool ${data.poolId || 'default'}`,
    data.amount
  );

  console.log(`[LeaderboardUpdater] Stake: ${data.username} +${points} points`);
}

// ── Referral Event Handler ─────────────────────────────────────
export async function onReferralCreated(data: {
  referrerAddress: string;
  referrerUsername: string;
  refereeAddress: string;
  refereeUsername: string;
}) {
  const points = calculatePoints({ referralCount: 1 });
  
  await updateLeaderboardEntry(
    data.referrerAddress,
    data.referrerUsername,
    'referral',
    points
  );

  await logActivity(
    data.referrerAddress,
    data.referrerUsername,
    'referral',
    `New referral: ${data.refereeUsername}`,
    points
  );

  console.log(`[LeaderboardUpdater] Referral: ${data.referrerUsername} +${points} points`);
}

// ── Get Leaderboard with Filters ──────────────────────────────
export async function getLeaderboardData(params: {
  category?: 'trading' | 'gaming' | 'staking' | 'referral';
  timeRange?: 'daily' | 'weekly' | 'monthly' | 'all';
  limit?: number;
}) {
  const { category, timeRange = 'all', limit = 100 } = params;
  
  try {
    // Get all entries ordered by score
    let entries = await db.select().from(leaderboard)
      .orderBy(desc(leaderboard.score))
      .limit(limit);

    // Apply time filter
    if (timeRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      
      switch (timeRange) {
        case 'daily':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }

      entries = entries.filter(e => 
        e.updatedAt && new Date(e.updatedAt) >= cutoff
      );
    }

    // Add ranks
    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      category: category || 'all'
    }));
  } catch (error) {
    console.error('[LeaderboardUpdater] Error fetching leaderboard:', error);
    return [];
  }
}

// ── Recalculate All Leaderboard (Admin) ───────────────────────
export async function recalculateAllLeaderboard() {
  try {
    // Get all activities grouped by wallet
    const activities = await db.select().from(activityFeed)
      .orderBy(desc(activityFeed.createdAt));

    const walletStats = new Map<string, {
      walletAddress: string;
      username: string;
      tradeVolume: number;
      stakeAmount: number;
      referralCount: number;
      gamesWon: number;
    }>();

    for (const activity of activities) {
      const stats = walletStats.get(activity.walletAddress) || {
        walletAddress: activity.walletAddress,
        username: activity.username || 'Anonymous',
        tradeVolume: 0,
        stakeAmount: 0,
        referralCount: 0,
        gamesWon: 0
      };

      switch (activity.action) {
        case 'trading':
          stats.tradeVolume += activity.amount || 0;
          break;
        case 'staking':
          stats.stakeAmount += activity.amount || 0;
          break;
        case 'referral':
          stats.referralCount += 1;
          break;
        case 'gaming':
          if (activity.detail?.includes('Won')) {
            stats.gamesWon += 1;
          }
          break;
      }

      walletStats.set(activity.walletAddress, stats);
    }

    // Update leaderboard entries
    for (const [, stats] of walletStats) {
      const totalPoints = calculatePoints({
        tradeVolume: stats.tradeVolume,
        stakeAmount: stats.stakeAmount,
        referralCount: stats.referralCount,
        gamesWon: stats.gamesWon
      });

      await updateLeaderboardEntry(
        stats.walletAddress,
        stats.username,
        'all' as any,
        totalPoints
      );
    }

    console.log(`[LeaderboardUpdater] Recalculated ${walletStats.size} entries`);
    return walletStats.size;
  } catch (error) {
    console.error('[LeaderboardUpdater] Recalculation error:', error);
    return 0;
  }
}

export default {
  setLeaderboardBroadcast,
  onTradeExecuted,
  onGamePlayed,
  onStakeDeposited,
  onReferralCreated,
  getLeaderboardData,
  recalculateAllLeaderboard
};
