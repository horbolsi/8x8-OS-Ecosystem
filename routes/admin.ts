// ============================================================
// 8x8 Hub - Admin API Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { requireFlashSecret, blockExternalDebug, rateLimit } from '@/middleware/security';
import { db } from '@/db';
import { leaderboard, activityFeed } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Apply security middleware to all routes
router.use(blockExternalDebug);
router.use(rateLimit(50, 60000));

// ── User Management ─────────────────────────────────────────

router.get('/users', requireFlashSecret, async (req: Request, res: Response) => {
  try {
    const users = await db.query('hub_users').findMany({
      columns: {
        id: true,
        telegram_id: true,
        username: true,
        role: true,
        badges: true,
        title: true,
        points: true,
        subscription_end: true,
        features: true,
        ecosystem_id: true,
      },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/update-role', requireFlashSecret, async (req: Request, res: Response) => {
  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ error: 'userId and role are required' });
  }
  
  const validRoles = ['owner', 'admin', 'developer', 'moderator', 'super_user', 'user'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  await db.update('hub_users').set({ role }).where(eq('hub_users.id', userId));
  res.json({ success: true });
});

router.post('/update-badges', requireFlashSecret, async (req: Request, res: Response) => {
  const { userId, badges } = req.body;
  if (!userId || !Array.isArray(badges)) {
    return res.status(400).json({ error: 'userId and badges array required' });
  }
  
  await db.update('hub_users').set({ badges }).where(eq('hub_users.id', userId));
  res.json({ success: true });
});

router.post('/update-title', requireFlashSecret, async (req: Request, res: Response) => {
  const { userId, title } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'userId and title required' });
  }
  
  await db.update('hub_users').set({ title }).where(eq('hub_users.id', userId));
  res.json({ success: true });
});

router.post('/update-features', requireFlashSecret, async (req: Request, res: Response) => {
  const { userId, features } = req.body;
  if (!userId || !Array.isArray(features)) {
    return res.status(400).json({ error: 'userId and features array required' });
  }
  
  await db.update('hub_users').set({ features }).where(eq('hub_users.id', userId));
  res.json({ success: true });
});

// ── Global Settings ─────────────────────────────────────────

let autoCommitEnabled = true;

router.get('/settings', requireFlashSecret, (req: Request, res: Response) => {
  res.json({ autoCommitEnabled });
});

router.post('/toggle-auto-commit', requireFlashSecret, async (req: Request, res: Response) => {
  const { enabled } = req.body;
  autoCommitEnabled = enabled === true;
  res.json({ success: true, autoCommitEnabled });
});

// ── Points System ───────────────────────────────────────────

/**
 * Calculate points based on user actions
 * Points = sqrt(trade_volume) / 100 + stake_amount * 0.01 + referral_count * 1000 + games_won * 500
 */
export function calculatePoints(data: {
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

// ── Leaderboard Hooks ───────────────────────────────────────

type BroadcastFn = (event: string, data: any) => void;
let broadcastFn: BroadcastFn | null = null;

export function setLeaderboardBroadcast(fn: BroadcastFn) {
  broadcastFn = fn;
}

// Update leaderboard entry for a user
async function updateLeaderboardEntry(
  walletAddress: string,
  username: string,
  scoreDelta: number
) {
  try {
    const existing = await db.select().from(leaderboard)
      .where(eq(leaderboard.walletAddress, walletAddress))
      .limit(1);

    if (existing.length > 0) {
      const newScore = Math.max(0, (existing[0].score || 0) + scoreDelta);
      await db.update(leaderboard)
        .set({ 
          score: newScore,
          username: username || existing[0].username,
          updatedAt: new Date()
        })
        .where(eq(leaderboard.id, existing[0].id));
      
      // Broadcast update
      if (broadcastFn) {
        broadcastFn('leaderboard:update', { walletAddress, score: newScore });
      }
      return { id: existing[0].id, score: newScore };
    } else {
      const [newEntry] = await db.insert(leaderboard).values({
        walletAddress,
        username: username || 'Anonymous',
        score: scoreDelta,
        rank: 0,
        badges: [],
        tier: 'Bronze'
      }).returning();
      
      if (broadcastFn && newEntry) {
        broadcastFn('leaderboard:update', { walletAddress, score: scoreDelta });
      }
      return newEntry;
    }
  } catch (error) {
    console.error('[Admin] Leaderboard update error:', error);
    return null;
  }
}

// ── Trade Hook ─────────────────────────────────────────────
router.post('/hooks/trade', async (req: Request, res: Response) => {
  const { walletAddress, username, tradeVolume, pair } = req.body;
  
  if (!walletAddress || !tradeVolume) {
    return res.status(400).json({ error: 'walletAddress and tradeVolume required' });
  }

  const points = calculatePoints({ tradeVolume });
  
  // Update leaderboard
  const entry = await updateLeaderboardEntry(walletAddress, username || 'Anonymous', points);
  
  // Log activity
  try {
    await db.insert(activityFeed).values({
      walletAddress,
      username: username || 'Anonymous',
      action: 'trading',
      detail: `Trade executed: ${pair || 'unknown pair'}`,
      amount: tradeVolume,
      createdAt: new Date()
    });
    
    // Broadcast activity
    if (broadcastFn) {
      broadcastFn('activity:new', { walletAddress, username, action: 'trading', detail: pair });
    }
  } catch (e) {
    console.error('[Admin] Activity log error:', e);
  }

  res.json({ success: true, points, entry });
});

// ── Game Hook ──────────────────────────────────────────────
router.post('/hooks/game', async (req: Request, res: Response) => {
  const { walletAddress, username, gameType, won, score } = req.body;
  
  if (!walletAddress) {
    return res.status(400).json({ error: 'walletAddress required' });
  }

  // Only award points for wins
  if (!won) {
    return res.json({ success: true, points: 0, message: 'No points for losses' });
  }

  const points = calculatePoints({ gamesWon: 1 });
  const entry = await updateLeaderboardEntry(walletAddress, username || 'Anonymous', points);
  
  try {
    await db.insert(activityFeed).values({
      walletAddress,
      username: username || 'Anonymous',
      action: 'gaming',
      detail: `Won ${gameType || 'game'}! Score: ${score || 0}`,
      amount: points,
      createdAt: new Date()
    });
    
    if (broadcastFn) {
      broadcastFn('activity:new', { walletAddress, username, action: 'gaming', detail: gameType });
    }
  } catch (e) {
    console.error('[Admin] Activity log error:', e);
  }

  res.json({ success: true, points, entry });
});

// ── Stake Hook ─────────────────────────────────────────────
router.post('/hooks/stake', async (req: Request, res: Response) => {
  const { walletAddress, username, amount, poolId } = req.body;
  
  if (!walletAddress || !amount) {
    return res.status(400).json({ error: 'walletAddress and amount required' });
  }

  const points = calculatePoints({ stakeAmount: amount });
  const entry = await updateLeaderboardEntry(walletAddress, username || 'Anonymous', points);
  
  try {
    await db.insert(activityFeed).values({
      walletAddress,
      username: username || 'Anonymous',
      action: 'staking',
      detail: `Staked ${amount} into pool ${poolId || 'default'}`,
      amount,
      createdAt: new Date()
    });
    
    if (broadcastFn) {
      broadcastFn('activity:new', { walletAddress, username, action: 'staking', amount });
    }
  } catch (e) {
    console.error('[Admin] Activity log error:', e);
  }

  res.json({ success: true, points, entry });
});

// ── Referral Hook ─────────────────────────────────────────
router.post('/hooks/referral', async (req: Request, res: Response) => {
  const { referrerAddress, referrerUsername, refereeUsername } = req.body;
  
  if (!referrerAddress) {
    return res.status(400).json({ error: 'referrerAddress required' });
  }

  const points = calculatePoints({ referralCount: 1 });
  const entry = await updateLeaderboardEntry(referrerAddress, referrerUsername || 'Anonymous', points);
  
  try {
    await db.insert(activityFeed).values({
      walletAddress: referrerAddress,
      username: referrerUsername || 'Anonymous',
      action: 'referral',
      detail: `New referral: ${refereeUsername || 'someone'}`,
      amount: points,
      createdAt: new Date()
    });
    
    if (broadcastFn) {
      broadcastFn('activity:new', { walletAddress: referrerAddress, username: referrerUsername, action: 'referral' });
    }
  } catch (e) {
    console.error('[Admin] Activity log error:', e);
  }

  res.json({ success: true, points, entry });
});

// ── Leaderboard GET ────────────────────────────────────────
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { category, timeRange = 'all', limit = 100 } = req.query;
    
    let users = await db.select().from(leaderboard)
      .orderBy(desc(leaderboard.score))
      .limit(Number(limit) || 100);
    
    // Time filter
    if (timeRange && timeRange !== 'all') {
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
      
      users = users.filter(u => u.updatedAt && new Date(u.updatedAt) >= cutoff);
    }

    // Add ranks
    const ranked = users.map((u, i) => ({ ...u, rank: i + 1 }));
    
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({ leaderboard: ranked, category: category || 'all' });
  } catch (error) {
    console.error('[Admin] Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── Recalculate Leaderboard ────────────────────────────────
router.post('/leaderboard/recalculate', requireFlashSecret, async (req: Request, res: Response) => {
  try {
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

    for (const [, stats] of walletStats) {
      const totalPoints = calculatePoints({
        tradeVolume: stats.tradeVolume,
        stakeAmount: stats.stakeAmount,
        referralCount: stats.referralCount,
        gamesWon: stats.gamesWon
      });

      await updateLeaderboardEntry(stats.walletAddress, stats.username, totalPoints);
    }

    res.json({ success: true, entriesUpdated: walletStats.size });
  } catch (error) {
    console.error('[Admin] Recalculate error:', error);
    res.status(500).json({ error: 'Recalculation failed' });
  }
});

export default router;
