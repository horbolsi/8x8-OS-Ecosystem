/**
 * Tokenomics & Profit Allocation Engine
 * Distributes profits based on: 30% miners, 20% stakers, 10% storage, 20% treasury, 20% ecosystem
 */

import { supabase } from '../server/db';
import { getTotalHashRate, calculateUserShare } from '../../mining/tracker';

export interface ProfitAllocation {
  miners: number;      // 30%
  stakers: number;    // 20%
  storage: number;    // 10%
  treasury: number;   // 20%
  ecosystem: number;  // 20%
}

export interface UserProfit {
  userId: string;
  category: 'mining' | 'staking' | 'storage';
  amount: number;
  percentage: number;
  txHash?: string;
}

// Profit allocation percentages
const ALLOCATION: ProfitAllocation = {
  miners: 0.30,
  stakers: 0.20,
  storage: 0.10,
  treasury: 0.20,
  ecosystem: 0.20
};

/**
 * Calculate daily profits for all users
 * Called by cron job daily
 */
export async function calculateDailyProfits(): Promise<void> {
  console.log('[Tokenomics] Starting daily profit calculation...');

  try {
    // Get total revenue (from subscriptions, pool payouts, etc.)
    // For now, use manual input or mock
    const totalRevenue = await getDailyRevenue();
    
    if (totalRevenue <= 0) {
      console.log('[Tokenomics] No revenue to distribute');
      return;
    }

    // Calculate pool sizes
    const pools = {
      miners: totalRevenue * ALLOCATION.miners,
      stakers: totalRevenue * ALLOCATION.stakers,
      storage: totalRevenue * ALLOCATION.storage,
      treasury: totalRevenue * ALLOCATION.treasury,
      ecosystem: totalRevenue * ALLOCATION.ecosystem
    };

    console.log(`[Tokenomics] Total revenue: ${totalRevenue}`);
    console.log(`[Tokenomics] Mining pool: ${pools.miners}`);
    console.log(`[Tokenomics] Staking pool: ${pools.stakers}`);
    console.log(`[Tokenomics] Storage pool: ${pools.storage}`);

    // Distribute to miners
    await distributeMiningProfits(pools.miners);

    // Distribute to stakers
    await distributeStakingProfits(pools.stakers);

    // Distribute to storage providers
    await distributeStorageProfits(pools.storage);

    // Log treasury allocation
    await logAllocation('treasury', pools.treasury, 'System Treasury');
    await logAllocation('ecosystem', pools.ecosystem, 'Ecosystem Fund');

    console.log('[Tokenomics] Daily profit calculation complete');
  } catch (error) {
    console.error('[Tokenomics] Error calculating profits:', error);
    throw error;
  }
}

/**
 * Get daily revenue from all sources
 */
async function getDailyRevenue(): Promise<number> {
  // Check for manual admin input first
  try {
    const { data: setting } = await supabase
      .from('hub_settings')
      .select('value')
      .eq('key', 'manual_revenue_input')
      .single();

    if (setting?.value) {
      const revenue = JSON.parse(setting.value);
      if (revenue.amount > 0) {
        return revenue.amount;
      }
    }
  } catch {
    // No manual input
  }

  // Calculate from subscriptions
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: subs } = await supabase
      .from('hub_subscriptions')
      .select('amount')
      .gte('created_at', today);

    if (subs) {
      return subs.reduce((sum, s) => sum + (s.amount || 0), 0);
    }
  } catch {
    // No subscription data
  }

  // Return 0 if no revenue
  return 0;
}

/**
 * Distribute mining profits based on hashrate share
 */
async function distributeMiningProfits(poolAmount: number): Promise<void> {
  // Get all active miners
  const { data: miners } = await supabase
    .from('mining_hashrate')
    .select('user_id, hashrate')
    .gte('hashrate', 1);

  if (!miners || miners.length === 0) {
    console.log('[Tokenomics] No active miners');
    return;
  }

  const totalHashRate = miners.reduce((sum, m) => sum + m.hashrate, 0);

  for (const miner of miners) {
    const share = miner.hashrate / totalHashRate;
    const userProfit = poolAmount * share;

    // Credit user balance
    await creditUserBalance(miner.user_id, userProfit, 'mining');

    // Log allocation
    await logUserProfit({
      userId: miner.user_id,
      category: 'mining',
      amount: userProfit,
      percentage: share * 100
    });
  }
}

/**
 * Distribute staking profits based on stake share
 */
async function distributeStakingProfits(poolAmount: number): Promise<void> {
  const { data: stakers } = await supabase
    .from('mining_staking')
    .select('user_id, staked_amount')
    .gte('staked_amount', 1);

  if (!stakers || stakers.length === 0) {
    console.log('[Tokenomics] No active stakers');
    return;
  }

  const totalStake = stakers.reduce((sum, s) => sum + s.staked_amount, 0);

  for (const staker of stakers) {
    const share = staker.staked_amount / totalStake;
    const userProfit = poolAmount * share;

    await creditUserBalance(staker.user_id, userProfit, 'staking');

    await logUserProfit({
      userId: staker.user_id,
      category: 'staking',
      amount: userProfit,
      percentage: share * 100
    });
  }
}

/**
 * Distribute storage profits
 */
async function distributeStorageProfits(poolAmount: number): Promise<void> {
  const { data: providers } = await supabase
    .from('mining_storage')
    .select('user_id, storage_gb')
    .gte('storage_gb', 0.1); // At least 100MB

  if (!providers || providers.length === 0) {
    console.log('[Tokenomics] No storage providers');
    return;
  }

  const totalStorage = providers.reduce((sum, p) => sum + p.storage_gb, 0);

  for (const provider of providers) {
    const share = provider.storage_gb / totalStorage;
    const userProfit = poolAmount * share;

    await creditUserBalance(provider.user_id, userProfit, 'storage');

    await logUserProfit({
      userId: provider.user_id,
      category: 'storage',
      amount: userProfit,
      percentage: share * 100
    });
  }
}

/**
 * Credit user balance
 */
async function creditUserBalance(
  userId: string,
  amount: number,
  source: string
): Promise<void> {
  try {
    // Update profit_balance in hub_users
    await supabase.rpc('increment_profit_balance', {
      user_id_param: userId,
      amount_param: amount
    }).catch(() => {
      // Fallback if RPC doesn't exist
      return supabase
        .from('hub_users')
        .update({
          profit_balance: supabase.rpc('COALESCE', { profit_balance: 0 }) + amount
        } as any)
        .eq('id', userId);
    });
  } catch (error) {
    console.error(`[Tokenomics] Failed to credit user ${userId}:`, error);
  }
}

/**
 * Log allocation to database
 */
async function logAllocation(
  category: string,
  amount: number,
  recipient: string
): Promise<void> {
  await supabase.from('profit_allocation_log').insert({
    category,
    amount,
    recipient,
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  });
}

/**
 * Log individual user profit
 */
async function logUserProfit(profit: UserProfit): Promise<void> {
  await supabase.from('profit_allocation_log').insert({
    user_id: profit.userId,
    category: profit.category,
    amount: profit.amount,
    percentage: profit.percentage,
    tx_hash: profit.txHash,
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  });
}

/**
 * Get user's reward history
 */
export async function getUserRewards(userId: string) {
  const { data } = await supabase
    .from('profit_allocation_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  return data || [];
}

/**
 * Get user's current profit balance
 */
export async function getUserBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from('hub_users')
    .select('profit_balance')
    .eq('id', userId)
    .single();

  return data?.profit_balance || 0;
}