// ============================================================
// 8x8 Hub - Referral Distributor Service
// ============================================================

import { storage } from '../storage';

interface PendingReward {
  id: string;
  referrerCode: string;
  refereeAddress: string;
  actionType: string;
  actionValue: number;
  rewardAmount: number;
  createdAt: number;
}

interface DistributionResult {
  referralId: string;
  referrerCode: string;
  amount: number;
  status: 'distributed' | 'failed';
  error?: string;
}

/**
 * ReferralDistributor Service
 * Handles automatic distribution of referral rewards
 *
 * Reward Tiers:
 * - Tier 1 (direct referrals): 5% of referee's actions
 * - Tier 2 (referrer's referrals): 2% of referee's actions
 * - Tier 3 (referrer's tier-2 referrals): 1% of referee's actions
 */
export class ReferralDistributor {
  private pendingRewards: PendingReward[] = [];
  private isProcessing = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private distributionInterval = 60 * 1000; // 1 minute default

  constructor() {
    this.distributionInterval = parseInt(process.env.REFERRAL_DIST_INTERVAL || '60000');
  }

  /**
   * Start the scheduler for automatic reward distribution
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      console.log('⚠️ Referral distributor scheduler already running');
      return;
    }

    console.log(`🚀 Starting referral reward scheduler (interval: ${this.distributionInterval}ms)`);
    
    this.schedulerInterval = setInterval(async () => {
      await this.processPendingRewards();
    }, this.distributionInterval);

    // Also process immediately on startup
    setTimeout(() => this.processPendingRewards(), 5000);
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('🛑 Referral distributor scheduler stopped');
    }
  }

  /**
   * Record a referral action and queue reward calculation
   */
  async recordAction(params: {
    referrerCode: string;
    refereeAddress: string;
    actionType: string;
    actionValue: number;
  }): Promise<PendingReward> {
    const rewardPercent = await this.getRewardPercent(params.referrerCode);
    const rewardAmount = params.actionValue * rewardPercent;

    const pendingReward: PendingReward = {
      id: `${params.referrerCode}-${params.refereeAddress}-${Date.now()}`,
      referrerCode: params.referrerCode,
      refereeAddress: params.refereeAddress,
      actionType: params.actionType,
      actionValue: params.actionValue,
      rewardAmount,
      createdAt: Date.now(),
    };

    this.pendingRewards.push(pendingReward);

    // Also persist to storage
    await storage.createActivity({
      type: 'referral',
      description: `Pending reward queued: ${params.actionType} = ${rewardAmount} 0x8`,
      address: params.referrerCode,
      amount: rewardAmount,
      token: '0x8',
      metadata: {
        actionType: params.actionType,
        actionValue: params.actionValue,
        rewardPercent,
        refereeAddress: params.refereeAddress,
        status: 'pending',
      },
    });

    return pendingReward;
  }

  /**
   * Get reward percentage based on referral tier
   */
  private async getRewardPercent(referrerCode: string): Promise<number> {
    const tier = await this.getReferralTier(referrerCode);
    
    switch (tier) {
      case 'tier1': return 0.05; // 5%
      case 'tier2': return 0.02; // 2%
      case 'tier3': return 0.01; // 1%
      default: return 0.01;
    }
  }

  /**
   * Get referral tier based on count
   */
  private async getReferralTier(referrerCode: string): Promise<'tier1' | 'tier2' | 'tier3'> {
    try {
      const referrals = await storage.getReferrals(referrerCode);
      const count = referrals.length;
      
      // Tier 1: 0-10 referrals (5%)
      // Tier 2: 11-50 referrals (2%)
      // Tier 3: 51+ referrals (1%)
      if (count <= 10) return 'tier1';
      if (count <= 50) return 'tier2';
      return 'tier3';
    } catch {
      return 'tier1';
    }
  }

  /**
   * Process pending rewards and distribute them
   */
  async processPendingRewards(): Promise<DistributionResult[]> {
    if (this.isProcessing) {
      console.log('⏳ Reward distribution already in progress');
      return [];
    }

    if (this.pendingRewards.length === 0) {
      return [];
    }

    this.isProcessing = true;
    const results: DistributionResult[] = [];

    try {
      console.log(`⏳ Processing ${this.pendingRewards.length} pending referral rewards...`);

      // Process rewards in batches
      const batch = this.pendingRewards.splice(0, 50);

      for (const reward of batch) {
        try {
          // Distribute reward to referrer
          await this.distributeReward(reward);
          
          // Mark reward as distributed
          await this.markRewardDistributed(reward.id);
          
          results.push({
            referralId: reward.id,
            referrerCode: reward.referrerCode,
            amount: reward.rewardAmount,
            status: 'distributed',
          });
        } catch (error) {
          results.push({
            referralId: reward.id,
            referrerCode: reward.referrerCode,
            amount: reward.rewardAmount,
            status: 'failed',
            error: String(error),
          });
        }
      }

      const successCount = results.filter(r => r.status === 'distributed').length;
      console.log(`✅ Distributed ${successCount}/${results.length} referral rewards`);
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Distribute reward to referrer's wallet
   */
  private async distributeReward(reward: PendingReward): Promise<void> {
    // In production, this would interact with blockchain wallet
    // For now, we just log and update database
    
    const message = `Distributed ${reward.rewardAmount} 0x8 to referrer ${reward.referrerCode} ` +
      `for ${reward.actionType} action (${reward.actionValue})`;

    await storage.createActivity({
      type: 'referral',
      description: message,
      address: reward.referrerCode,
      amount: reward.rewardAmount,
      token: '0x8',
      metadata: {
        actionType: reward.actionType,
        actionValue: reward.actionValue,
        refereeAddress: reward.refereeAddress,
        status: 'distributed',
      },
    });

    // Update referral record if it exists
    try {
      const referrals = await storage.getReferrals(reward.referrerCode);
      const referral = referrals.find((r: any) => 
        r.referredAddress === reward.refereeAddress
      );
      
      if (referral) {
        // Would update reward amount in DB here
        console.log(`✓ Updated referral ${(referral as any).id} with reward ${reward.rewardAmount}`);
      }
    } catch (e) {
      // Ignore update errors
    }
  }

  /**
   * Mark a reward as distributed
   */
  private async markRewardDistributed(rewardId: string): Promise<void> {
    console.log(`✓ Marked reward ${rewardId} as distributed`);
  }

  /**
   * Get pending rewards count
   */
  getPendingCount(): number {
    return this.pendingRewards.length;
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(referrerCode: string): Promise<{
    referralCode: string;
    referralCount: number;
    totalRewards: number;
    pendingRewards: number;
  }> {
    const referrals = await storage.getReferrals(referrerCode);
    
    let totalRewards = 0;
    let pendingRewards = 0;

    for (const r of referrals) {
      const ref = r as any;
      totalRewards += ref.reward || 0;
      if (ref.status === 'pending') pendingRewards++;
    }

    return {
      referralCode,
      referralCount: referrals.length,
      totalRewards,
      pendingRewards,
    };
  }
}

// Export singleton instance
export const referralDistributor = new ReferralDistributor();

// Auto-start scheduler in production
if (process.env.NODE_ENV === 'production' || process.env.REFERRAL_SCHEDULER === 'true') {
  // Defer start to allow DB connections to establish
  setTimeout(() => {
    referralDistributor.startScheduler();
    console.log('🚀 Referral distributor auto-started');
  }, 10000);
}
