/**
 * Tokenomics Routes - Profit allocation engine + Payment webhook
 * Uses PostgreSQL pool from db.ts - no supabase.
 */

import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Payment addresses (configure via environment variables in production)
const PAYMENT_ADDRESSES: Record<string, string> = {
  ethereum: process.env.ETH_PAYMENT_ADDRESS || '0x8x8Ecosystem1234567890abcdef1234567890abcd',
  polygon: process.env.POLYGON_PAYMENT_ADDRESS || '0x8x8Ecosystem1234567890abcdef1234567890abcd',
  bsc: process.env.BSC_PAYMENT_ADDRESS || '0x8x8Ecosystem1234567890abcdef1234567890abcd',
};

// Profit allocation percentages
const ALLOCATION = {
  miners: 0.30,
  stakers: 0.20,
  storage: 0.10,
  treasury: 0.20,
  ecosystem: 0.20
};

// ============================================
// PAYMENT ENDPOINTS
// ============================================

/**
 * POST /api/tokenomics/payment/intent
 * Create payment intent before transaction
 */
router.post('/payment/intent', async (req, res) => {
  try {
    const { network, amount, txHash } = req.body;

    if (!network || !amount || !txHash) {
      return res.status(400).json({ error: 'Missing required fields: network, amount, txHash' });
    }

    // Validate network
    if (!PAYMENT_ADDRESSES[network]) {
      return res.status(400).json({ error: 'Unsupported network' });
    }

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log payment intent
    if (pool) {
      await pool.query(
        `INSERT INTO payment_intents (id, network, amount, tx_hash, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [paymentId, network, amount, txHash]
      );
    }

    res.json({
      success: true,
      id: paymentId,
      status: 'pending',
      paymentAddress: PAYMENT_ADDRESSES[network],
    });
  } catch (error) {
    console.error('[Tokenomics] Payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * POST /api/tokenomics/payment/confirm
 * Confirm payment after on-chain verification
 */
router.post('/payment/confirm', async (req, res) => {
  try {
    const { txHash, confirmed, blockNumber } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'txHash required' });
    }

    // Update payment status
    if (pool) {
      await pool.query(
        `UPDATE payment_intents
         SET status = $1, confirmed_at = NOW(), block_number = $2
         WHERE tx_hash = $3`,
        [confirmed ? 'confirmed' : 'failed', blockNumber || null, txHash]
      );

      if (confirmed) {
        // Create subscription for the user
        // In production, extract user_id from auth token
        const userId = req.headers['x-user-id'] || 'anonymous';
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await pool.query(
          `INSERT INTO subscriptions (user_id, plan, status, expires_at, created_at)
           VALUES ($1, 'quarterly', 'active', $2, NOW())
           ON CONFLICT (user_id) 
           DO UPDATE SET status = 'active', expires_at = $2, plan = 'quarterly'`,
          [userId, expiresAt]
        );
      }
    }

    res.json({
      success: true,
      subscriptionId: confirmed ? `sub_${Date.now()}` : null,
    });
  } catch (error) {
    console.error('[Tokenomics] Payment confirm error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

/**
 * GET /api/tokenomics/payment/status/:txHash
 * Get payment status
 */
router.get('/payment/status/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    if (pool) {
      const result = await pool.query(
        `SELECT status, confirmations, block_number, created_at
         FROM payment_intents WHERE tx_hash = $1`,
        [txHash]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      return res.json(result.rows[0]);
    }

    res.json({ status: 'pending', confirmations: 0 });
  } catch (error) {
    console.error('[Tokenomics] Payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * GET /api/tokenomics/payment/networks
 * Get supported payment networks
 */
router.get('/payment/networks', (req, res) => {
  const networks = [
    {
      network: 'ethereum',
      address: PAYMENT_ADDRESSES.ethereum,
      symbol: 'ETH',
      minAmount: '0.01',
      chainId: 1,
    },
    {
      network: 'polygon',
      address: PAYMENT_ADDRESSES.polygon,
      symbol: 'MATIC',
      minAmount: '10',
      chainId: 137,
    },
    {
      network: 'bsc',
      address: PAYMENT_ADDRESSES.bsc,
      symbol: 'BNB',
      minAmount: '0.1',
      chainId: 56,
    },
  ];

  res.json(networks);
});

/**
 * GET /api/tokenomics/subscription
 * Get user subscription status
 */
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';

    if (pool) {
      const result = await pool.query(
        `SELECT status, plan, expires_at FROM subscriptions WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({ active: false });
      }

      const sub = result.rows[0];
      const expiresAt = new Date(sub.expires_at);
      const isActive = sub.status === 'active' && expiresAt > new Date();

      return res.json({
        active: isActive,
        expiresAt: sub.expires_at,
        tier: sub.plan,
      });
    }

    res.json({ active: false });
  } catch (error) {
    console.error('[Tokenomics] Subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// ============================================
// PROFIT ALLOCATION ENDPOINTS
// ============================================

/**
 * GET /api/tokenomics/allocation
 * Get current allocation percentages
 */
router.get('/allocation', (req, res) => {
  res.json({
    allocation: ALLOCATION,
    total: 1.0
  });
});

/**
 * POST /api/tokenomics/admin/revenue
 * Admin adds revenue (owner only)
 */
router.post('/admin/revenue', async (req, res) => {
  try {
    const { amount, source, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    if (!pool) {
      return res.json({ success: true, message: 'Revenue logged (no DB)' });
    }

    // Log revenue
    await pool.query(
      `INSERT INTO profit_revenue (amount, source, notes, created_at) VALUES ($1, $2, $3, NOW())`,
      [amount, source || 'manual', notes || '']
    );

    res.json({ success: true, amount, source });
  } catch (error) {
    console.error('[Tokenomics] Revenue error:', error);
    res.status(500).json({ error: 'Failed to log revenue' });
  }
});

/**
 * GET /api/tokenomics/user/:userId/earnings
 * Get user's earnings history
 */
router.get('/user/:userId/earnings', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    if (!pool) {
      return res.json({ earnings: [], total_earned: 0 });
    }

    const result = await pool.query(
      `SELECT * FROM profit_allocation_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const total = await pool.query(
      `SELECT SUM(user_share) as total FROM profit_allocation_log WHERE user_id = $1`,
      [userId]
    );

    res.json({
      earnings: result.rows,
      total_earned: parseFloat(total.rows[0]?.total || '0')
    });
  } catch (error) {
    console.error('[Tokenomics] Earnings error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

/**
 * POST /api/tokenomics/calculate
 * Run daily profit calculation (owner only)
 */
router.post('/calculate', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: true, message: 'Calculation skipped (no DB)' });
    }

    // Get total revenue
    const revenueResult = await pool.query(
      `SELECT SUM(amount) as total FROM profit_revenue
       WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'`
    );
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total || '0');

    if (totalRevenue <= 0) {
      return res.json({ message: 'No revenue to distribute', total_revenue: 0 });
    }

    // Calculate shares for miners (based on hashrate contribution)
    const minersResult = await pool.query(
      `SELECT user_id, SUM(hashrate_hs) as hashrate
       FROM mining_hashrate
       WHERE reported_at >= CURRENT_DATE - INTERVAL '1 day'
       GROUP BY user_id`
    );
    const totalHashrate = minersResult.rows.reduce((sum, r) => sum + parseFloat(r.hashrate || '0'), 0);

    // Distribute to miners
    for (const miner of minersResult.rows) {
      const share = totalHashrate > 0 ? (parseFloat(miner.hashrate) / totalHashrate) * totalRevenue * ALLOCATION.miners : 0;
      await pool.query(
        `INSERT INTO profit_allocation_log (user_id, date, total_profit, user_share, category, created_at)
         VALUES ($1, CURRENT_DATE, $2, $3, 'mining', NOW())`,
        [miner.user_id, totalRevenue, share]
      );
    }

    res.json({
      success: true,
      total_revenue: totalRevenue,
      miners_paid: minersResult.rows.length
    });
  } catch (error) {
    console.error('[Tokenomics] Calculate error:', error);
    res.status(500).json({ error: 'Failed to calculate profits' });
  }
});

export default router;

export const registerTokenomicsRoutes = (app) => { 
  app.use('/tokenomics', router); 
};
