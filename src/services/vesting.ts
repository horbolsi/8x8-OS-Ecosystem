/**
 * 88-Year Vesting System
 * Linear unlock over 32,120 days (88 years)
 * Users can claim unlocked tokens after TGE
 */

import { supabase } from '../../server/db';
import Decimal from 'decimal.js';

// Vesting constants
const VESTING_DAYS = 88 * 365; // 32,120 days

export interface VestingInfo {
  totalEarned: string;
  claimedTokens: string;
  claimableNow: string;
  remainingLocked: string;
  unlockProgress: number; // 0-100%
  vestingCompleteDate: string;
}

/**
 * Calculate vesting unlock for a user
 */
export function calculateVestingUnlock(
  totalEarned: number,
  startDate: Date,
  claimedTokens: number = 0
): VestingInfo {
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysVested = Math.min(daysSinceStart, VESTING_DAYS);
  
  const totalUnlockable = new Decimal(totalEarned).times(daysVested).div(VESTING_DAYS);
  const claimable = totalUnlockable.minus(claimedTokens).max(0);
  const remaining = new Decimal(totalEarned).minus(totalUnlockable).max(0);
  const progress = (daysVested / VESTING_DAYS) * 100;
  
  const completionDate = new Date(startDate);
  completionDate.setFullYear(completionDate.getFullYear() + 88);

  return {
    totalEarned: totalEarned.toFixed(18),
    claimedTokens: claimedTokens.toFixed(18),
    claimableNow: claimable.toFixed(18),
    remainingLocked: remaining.toFixed(18),
    unlockProgress: Math.round(progress * 100) / 100,
    vestingCompleteDate: completionDate.toISOString()
  };
}

/**
 * Initialize or update vesting schedule for user
 */
export async function initVestingSchedule(userId: string): Promise<void> {
  const { error } = await supabase
    .from('vesting_schedules')
    .upsert({
      user_id: userId,
      total_earned_tokens: '0',
      claimed_tokens: '0',
      start_date: new Date().toISOString(),
      next_unlock_date: getNextUnlockDate().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) console.error('[Vesting] Init error:', error);
}

/**
 * Add earned tokens to vesting (called by tokenomics daily)
 */
export async function addToVesting(
  userId: string,
  tokensAmount: number,
  source: 'mining' | 'staking' | 'storage' | 'referral'
): Promise<void> {
  // Get or create schedule
  let { data: schedule } = await supabase
    .from('vesting_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!schedule) {
    await initVestingSchedule(userId);
    ({ data: schedule } = await supabase
      .from('vesting_schedules')
      .select('*')
      .eq('user_id', userId)
      .single());
  }

  if (schedule) {
    const currentTotal = new Decimal(schedule.total_earned_tokens || '0');
    const newTotal = currentTotal.plus(tokensAmount);

    await supabase
      .from('vesting_schedules')
      .update({ 
        total_earned_tokens: newTotal.toFixed(18),
        last_contribution: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Log contribution
    await supabase.from('vesting_contributions').insert({
      user_id: userId,
      amount: tokensAmount.toString(),
      source,
      created_at: new Date().toISOString()
    });
  }
}

/**
 * Claim available tokens
 */
export async function claimTokens(userId: string): Promise<{ success: boolean; amount: string; message: string }> {
  const { data: schedule } = await supabase
    .from('vesting_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!schedule) {
    return { success: false, amount: '0', message: 'No vesting schedule found' };
  }

  const vestingInfo = calculateVestingUnlock(
    parseFloat(schedule.total_earned_tokens || '0'),
    new Date(schedule.start_date),
    parseFloat(schedule.claimed_tokens || '0')
  );

  const claimAmount = new Decimal(vestingInfo.claimableNow);

  if (claimAmount.lte(0)) {
    return { success: false, amount: '0', message: 'No tokens available to claim' };
  }

  // Update claimed tokens
  const newClaimed = new Decimal(schedule.claimed_tokens || '0').plus(claimAmount);

  await supabase
    .from('vesting_schedules')
    .update({ 
      claimed_tokens: newClaimed.toFixed(18),
      last_claim: new Date().toISOString()
    })
    .eq('user_id', userId);

  // Log claim
  await supabase.from('profit_allocation_log').insert({
    user_id: userId,
    category: 'claim',
    amount: claimAmount.toFixed(18),
    action: 'claim',
    date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  });

  return {
    success: true,
    amount: claimAmount.toFixed(18),
    message: `Successfully claimed ${claimAmount.toFixed(8)} tokens`
  };
}

/**
 * Get user's vesting info
 */
export async function getVestingInfo(userId: string): Promise<VestingInfo | null> {
  const { data: schedule } = await supabase
    .from('vesting_schedules')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!schedule) return null;

  return calculateVestingUnlock(
    parseFloat(schedule.total_earned_tokens || '0'),
    new Date(schedule.start_date),
    parseFloat(schedule.claimed_tokens || '0')
  );
}

/**
 * Get next unlock date (00:00 UTC)
 */
function getNextUnlockDate(): Date {
  const next = new Date();
  next.setUTCHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Daily vesting cron job - updates next unlock dates
 */
export async function runVestingCron(): Promise<void> {
  console.log('[Vesting] Running daily cron...');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Log daily unlock calculation
  await supabase.from('hub_events').insert({
    event_type: 'vesting_cron',
    action: 'daily_unlock_calc',
    details: { date: today },
    created_at: new Date().toISOString()
  });

  console.log('[Vesting] Daily cron complete');
}