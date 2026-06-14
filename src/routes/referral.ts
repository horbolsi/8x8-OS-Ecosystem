// ============================================================
// 8x8 Hub - Referral Routes
// ============================================================

import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Generate unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '8X8-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Middleware: require hub auth
async function requireHubAuth(req: any, res: any, next: any) {
  try {
    const token = req.headers['x-hub-token'] as string;
    if (!token) return res.status(401).json({ error: 'No token' });

    const { findUserByToken } = await import('../hub-db.js');
    const user = await findUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    if (user.is_banned) return res.status(403).json({ error: 'Account banned' });

    (req as any).hubUser = user;
    return next();
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Server error' });
  }
}

// Get or create referral code for user
router.get('/code', requireHubAuth, async (req: any, res) => {
  try {
    const user = req.hubUser;
    let code = user.referral_code;
    
    if (!code) {
      code = generateReferralCode();
      // In production, would update user with new code
      await storage.createActivity({
        type: 'referral',
        description: `Generated referral code: ${code}`,
        address: user.wallet_address || 'unknown',
        metadata: { code },
      });
    }
    
    const baseUrl = process.env.HUB_URL || 'https://8x8-hub.app';
    res.json({ 
      code, 
      link: `${baseUrl}/register?ref=${code}` 
    });
  } catch (error) {
    console.error('Error getting referral code:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// Get referral stats
router.get('/stats', requireHubAuth, async (req: any, res) => {
  try {
    const user = req.hubUser;
    const userCode = user.referral_code || generateReferralCode();
    
    // Get all referrals made by this user
    const allReferrals = await storage.getReferrals(userCode);
    
    const totalReferrals = allReferrals.length;
    const completedReferrals = allReferrals.filter((r: any) => r.status === 'completed').length;
    const pendingReferrals = allReferrals.filter((r: any) => r.status === 'pending').length;
    
    // Calculate total rewards (1% of referee's actions)
    const totalRewards = allReferrals.reduce((sum: number, r: any) => sum + (r.reward || 0), 0);
    
    // Determine tier based on referral count
    let tier: 'bronze' | 'silver' | 'gold' = 'bronze';
    if (totalReferrals >= 25) tier = 'gold';
    else if (totalReferrals >= 10) tier = 'silver';
    
    const baseUrl = process.env.HUB_URL || 'https://8x8-hub.app';
    
    res.json({
      referralLink: `${baseUrl}/register?ref=${userCode}`,
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      totalRewards,
      tier,
    });
  } catch (error) {
    console.error('Error getting referral stats:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// Get referral list
router.get('/list', requireHubAuth, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const user = req.hubUser;
    const userCode = user.referral_code || '';
    const allReferrals = await storage.getReferrals(userCode);
    
    const paginatedReferrals = allReferrals.slice(offset, offset + limit).map((r: any) => ({
      id: r.id,
      address: r.referredAddress,
      reward: r.reward,
      status: r.status,
      createdAt: r.createdAt,
    }));
    
    res.json({
      referrals: paginatedReferrals,
      total: allReferrals.length,
      page,
      totalPages: Math.ceil(allReferrals.length / limit),
    });
  } catch (error) {
    console.error('Error getting referral list:', error);
    res.status(500).json({ error: 'Failed to get referral list' });
  }
});

// Get referral leaderboard
router.get('/leaderboard', async (req: res) => {
  try {
    const allReferrals = await storage.getReferrals();
    
    // Group by referrer and calculate totals
    const referrerStats: Record<string, { code: string; count: number; rewards: number }> = {};
    
    for (const ref of allReferrals) {
      const refData = ref as any;
      if (!referrerStats[refData.referrerCode]) {
        referrerStats[refData.referrerCode] = { code: refData.referrerCode, count: 0, rewards: 0 };
      }
      referrerStats[refData.referrerCode].count++;
      referrerStats[refData.referrerCode].rewards += refData.reward || 0;
    }
    
    // Sort and get top 20
    const leaderboard = Object.values(referrerStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((stat, index) => ({
        rank: index + 1,
        code: stat.code,
        referralCount: stat.count,
        totalRewards: stat.rewards,
      }));
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting referral leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Register a new referral (called when new user signs up with code)
router.post('/register', async (req, res) => {
  try {
    const { referrerCode, referredAddress } = req.body;
    
    if (!referrerCode || !referredAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if referral already exists
    const existing = await storage.getReferrals(referrerCode);
    const alreadyReferred = existing.find((r: any) => r.referredAddress === referredAddress);
    
    if (alreadyReferred) {
      return res.status(400).json({ error: 'Address already referred' });
    }
    
    // Create pending referral (reward will be distributed when referee's actions occur)
    const referral = await storage.createReferral({
      referrerCode,
      referredAddress,
      reward: 0,
      status: 'pending',
    });
    
    res.json({ success: true, referral });
  } catch (error) {
    console.error('Error registering referral:', error);
    res.status(500).json({ error: 'Failed to register referral' });
  }
});

// Record referral action and calculate reward (1% of action value)
router.post('/action', requireHubAuth, async (req: any, res) => {
  try {
    const user = req.hubUser;
    const { actionType, actionValue } = req.body;
    
    if (!actionType || actionValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find who referred this user
    const allReferrals = await storage.getReferrals();
    const myReferral = allReferrals.find((r: any) => r.referredAddress === user.wallet_address);
    
    if (!myReferral) {
      return res.status(400).json({ error: 'No referrer found' });
    }
    
    // Calculate 1% reward
    const rewardAmount = actionValue * 0.01;
    
    // Log the action
    await storage.createActivity({
      type: 'referral',
      description: `Referral action recorded: ${actionType} worth ${actionValue}`,
      address: (myReferral as any).referrerCode,
      amount: rewardAmount,
      token: '0x8',
      metadata: { 
        actionType, 
        actionValue, 
        referredAddress: user.wallet_address,
        rewardPercent: 1,
      },
    });
    
    res.json({ 
      success: true, 
      reward: rewardAmount,
      message: `Referrer will receive ${rewardAmount} 0x8 (1% of ${actionValue})` 
    });
  } catch (error) {
    console.error('Error recording referral action:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

export function registerReferralRoutes(app: any): void {
  app.use('/api/referral', router);
  console.log('✅ Referral routes registered');
}

export default router;
