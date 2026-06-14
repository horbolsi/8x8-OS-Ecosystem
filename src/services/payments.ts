/**
 * Payment Integration Service
 * Supports Coinbase Commerce and Stripe Crypto
 * Environment variables required:
 * - COINBASE_COMMERCE_API_KEY
 * - STRIPE_API_KEY
 */

import { supabase } from '../../server/db';

// Payment providers
const COINBASE_URL = 'https://api.commerce.coinbase.com';
const STRIPE_URL = 'https://api.stripe.com';

interface PaymentConfig {
  plan: 'monthly' | 'quarterly' | 'annual';
  amount_usd: number;
  tokens_granted: number;
}

const PLANS: Record<string, PaymentConfig> = {
  monthly: { plan: 'monthly', amount_usd: 9.99, tokens_granted: 100 },
  quarterly: { plan: 'quarterly', amount_usd: 24.99, tokens_granted: 300 },
  annual: { plan: 'annual', amount_usd: 79.99, tokens_granted: 1200 }
};

/**
 * Create Coinbase Commerce charge
 */
export async function createCoinbaseCharge(
  userId: string,
  plan: string
): Promise<{ success: boolean; charge_id?: string; hosted_url?: string; error?: string }> {
  const config = PLANS[plan];
  if (!config) {
    return { success: false, error: 'Invalid plan' };
  }

  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Coinbase Commerce not configured' };
  }

  try {
    const response = await fetch(`${COINBASE_URL}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22'
      },
      body: JSON.stringify({
        name: `8x8-Hub ${config.plan} Subscription`,
        description: 'Access to 8x8-Hub Web3 Mining Platform',
        pricing_type: 'fixed_price',
        local_price: {
          amount: config.amount_usd.toString(),
          currency: 'USD'
        },
        metadata: {
          user_id: userId,
          plan: config.plan
        }
      })
    });

    const data = await response.json();

    if (data.data) {
      // Store pending payment
      await supabase.from('pending_payments').insert({
        user_id: userId,
        provider: 'coinbase',
        charge_id: data.data.id,
        amount_usd: config.amount_usd,
        plan: config.plan,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      return {
        success: true,
        charge_id: data.data.id,
        hosted_url: data.data.hosted_url
      };
    }

    return { success: false, error: 'Failed to create charge' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check Coinbase charge status (webhook handler alternative)
 */
export async function checkCoinbaseCharge(chargeId: string): Promise<{ status: string; paid: boolean }> {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  
  try {
    const response = await fetch(`${COINBASE_URL}/charges/${chargeId}`, {
      headers: {
        'X-CC-Api-Key': apiKey || '',
        'X-CC-Version': '2018-03-22'
      }
    });

    const data = await response.json();
    return {
      status: data.data?.timeline?.[0]?.status || 'unknown',
      paid: data.data?.timeline?.some((t: any) => t.status === 'COMPLETED')
    };
  } catch {
    return { status: 'error', paid: false };
  }
}

/**
 * Confirm payment and upgrade subscription
 */
export async function confirmPayment(
  userId: string,
  provider: 'coinbase' | 'stripe',
  chargeId: string
): Promise<boolean> {
  const { data: payment } = await supabase
    .from('pending_payments')
    .select('*')
    .eq('user_id', userId)
    .eq('charge_id', chargeId)
    .eq('status', 'pending')
    .single();

  if (!payment) return false;

  const config = PLANS[payment.plan];
  
  // Update subscription
  const startDate = new Date();
  const endDate = new Date();
  
  switch (payment.plan) {
    case 'monthly': endDate.setMonth(endDate.getMonth() + 1); break;
    case 'quarterly': endDate.setMonth(endDate.getMonth() + 3); break;
    case 'annual': endDate.setFullYear(endDate.getFullYear() + 1); break;
  }

  const { error } = await supabase
    .from('hub_subscriptions')
    .upsert({
      user_id: userId,
      plan: payment.plan,
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_provider: provider,
      payment_id: chargeId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('[Payment] Subscription update failed:', error);
    return false;
  }

  // Update payment status
  await supabase
    .from('pending_payments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('charge_id', chargeId);

  // Grant tokens
  await supabase.rpc('grant_subscription_tokens', {
    p_user_id: userId,
    p_tokens: config.tokens_granted
  }).catch(() => {
    // Fallback direct insert
    supabase.from('hub_wallets').upsert({
      user_id: userId,
      balance: config.tokens_granted,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  });

  console.log(`[Payment] User ${userId} upgraded to ${payment.plan}`);
  return true;
}

/**
 * Get payment history for user
 */
export async function getPaymentHistory(userId: string) {
  const { data } = await supabase
    .from('pending_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get available subscription plans
 */
export function getAvailablePlans() {
  return PLANS;
}