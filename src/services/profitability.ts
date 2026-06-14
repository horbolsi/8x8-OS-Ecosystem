/**
 * Profitability Fetcher - Updates mining network profitability every 6 hours
 * Uses free APIs to get real-time mining rewards
 */

import { supabase } from '../../server/db';

// Pre-configured mining networks
const DEFAULT_NETWORKS = [
  { name: 'Bitcoin', symbol: 'BTC', algorithm: 'SHA-256', pool_url: 'stratum+tcp://btc.poolbinance.com:3333' },
  { name: 'Ethereum', symbol: 'ETH', algorithm: 'Ethash', pool_url: 'stratum+tcp://eth.2miners.com:2020' },
  { name: 'Kaspa', symbol: 'KAS', algorithm: 'KHeavyHash', pool_url: 'stratum+tcp://pool.kaspa.org:443' },
  { name: 'Monero', symbol: 'XMR', algorithm: 'RandomX', pool_url: 'stratum+tcp://xmr.2miners.com:12222' },
  { name: 'Ravencoin', symbol: 'RVN', algorithm: 'KawPoW', pool_url: 'stratum+tcp://rvn.2miners.com:18080' }
];

interface NetworkProfit {
  name: string;
  symbol: string;
  profitability: number; // USD/day per TH/s or MH/s
}

/**
 * Fetch profitability from multiple sources
 * Using mock data for now - replace with real API calls
 */
async function fetchProfitabilities(): Promise<NetworkProfit[]> {
  // In production, integrate with real APIs:
  // - WhatToMine API
  // - MiningPoolStats
  // - Direct pool APIs
  
  // Mock data - real implementation would fetch from external APIs
  const mockProfitabilities: Record<string, number> = {
    'BTC': 0.15,   // USD/day per TH/s
    'ETH': 0.08,   // USD/day per MH/s
    'KAS': 0.25,   // USD/day per TH/s (very profitable)
    'XMR': 0.12,   // USD/day per KH/s
    'RVN': 0.05    // USD/day per TH/s
  };

  return Object.entries(mockProfitabilities).map(([symbol, prof]) => ({
    name: DEFAULT_NETWORKS.find(n => n.symbol === symbol)?.name || symbol,
    symbol,
    profitability: prof
  }));
}

/**
 * Update all network profitabilities in database
 * Called by cron job every 6 hours
 */
export async function updateProfitabilities(): Promise<void> {
  console.log('[Profitability] Fetching network data...');
  
  try {
    const networks = await fetchProfitabilities();
    
    for (const net of networks) {
      // Upsert network
      const { error } = await supabase
        .from('mining_networks')
        .upsert({
          name: net.name,
          symbol: net.symbol,
          algorithm: DEFAULT_NETWORKS.find(n => n.symbol === net.symbol)?.algorithm || 'unknown',
          current_profitability: net.profitability,
          pool_url: DEFAULT_NETWORKS.find(n => n.symbol === net.symbol)?.pool_url || '',
          last_updated: new Date().toISOString(),
          is_active: true
        }, {
          onConflict: 'symbol'
        });

      if (error) {
        console.error(`[Profitability] Failed to update ${net.symbol}:`, error);
      }

      // Log history
      const { data: networkData } = await supabase
        .from('mining_networks')
        .select('id')
        .eq('symbol', net.symbol)
        .single();

      if (networkData) {
        await supabase.from('profitability_history').insert({
          network_id: networkData.id,
          profitability: net.profitability,
          recorded_at: new Date().toISOString()
        });
      }
    }

    console.log(`[Profitability] Updated ${networks.length} networks`);
  } catch (error) {
    console.error('[Profitability] Error:', error);
    throw error;
  }
}

/**
 * Get the most profitable network for a given hashrate
 */
export async function recommendNetwork(
  hashrate: number, // H/s
  powerWatts: number = 0 // Optional power consumption
): Promise<{ network: any; estimated_daily_usd: number; explanation: string }> {
  const { data: networks } = await supabase
    .from('mining_networks')
    .select('*')
    .eq('is_active', true)
    .order('current_profitability', { ascending: false });

  if (!networks || networks.length === 0) {
    return {
      network: { name: 'Bitcoin', symbol: 'BTC' },
      estimated_daily_usd: 0,
      explanation: 'No network data available. Defaulting to BTC.'
    };
  }

  const best = networks[0];
  
  // Calculate estimated daily earnings
  let dailyEarnings: number;
  
  if (best.symbol === 'BTC') {
    dailyEarnings = (hashrate / 1e12) * best.current_profitability; // TH/s to H/s
  } else if (best.symbol === 'ETH') {
    dailyEarnings = (hashrate / 1e6) * best.current_profitability; // MH/s to H/s
  } else if (best.symbol === 'XMR') {
    dailyEarnings = (hashrate / 1e3) * best.current_profitability; // KH/s to H/s
  } else {
    dailyEarnings = (hashrate / 1e12) * best.current_profitability;
  }

  // Subtract electricity cost if provided (assumes $0.10/kWh)
  if (powerWatts > 0) {
    const dailyPowerCost = (powerWatts / 1000) * 24 * 0.10;
    dailyEarnings -= dailyPowerCost;
  }

  return {
    network: best,
    estimated_daily_usd: Math.max(0, dailyEarnings),
    explanation: `Based on current profitability data, ${best.name} (${best.symbol}) offers the best returns for your hashrate.`
  };
}

/**
 * Get all networks with current profitability
 */
export async function getAllNetworks() {
  const { data } = await supabase
    .from('mining_networks')
    .select('*')
    .eq('is_active', true)
    .order('current_profitability', { ascending: false });

  return data || [];
}