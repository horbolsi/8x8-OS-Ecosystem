// ============================================================
// 8x8 Hub - Security & Scam Investigation Routes
// Contract auditing, wallet reputation, and recovery
// ============================================================

import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Risk levels
type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

interface AuditResult {
  address: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  flags: string[];
  analysis: {
    honeypot: boolean;
    proxyPattern: boolean;
    mintFunction: boolean;
    hiddenOwner: boolean;
    suspiciousTransfers: boolean;
    unlimitedApproval: boolean;
  };
  recommendations: string[];
  analyzedAt: string;
}

// Honeypot detection patterns
const HONEYPOT_PATTERNS = [
  'onlyOwner can transfer',
  'no transfer allowed',
  'transfer disabled',
  'transfer locked',
];

const SUSPICIOUS_PATTERNS = [
  'approve unlimited',
  'setRule(_addr, true)',
  'addBlackList',
  'pausable',
  'selfdestruct',
  'SUICIDE',
];

// Static analysis for contract bytecode
function analyzeContractBytecode(bytecode: string): Partial<AuditResult['analysis']> {
  const lowerCode = bytecode.toLowerCase();
  
  return {
    honeypot: HONEYPOT_PATTERNS.some(p => lowerCode.includes(p.toLowerCase())),
    proxyPattern: lowerCode.includes('delegatecall') || lowerCode.includes('proxy'),
    mintFunction: lowerCode.includes('mint') || lowerCode.includes('safemint'),
    hiddenOwner: lowerCode.includes('onlyowner') || lowerCode.includes('owner()'),
    suspiciousTransfers: SUSPICIOUS_PATTERNS.some(p => lowerCode.includes(p.toLowerCase())),
    unlimitedApproval: lowerCode.includes('approve unlimited') || 
                       lowerCode.includes('approvalunlimited') ||
                       lowerCode.includes('uint256(-1)'),
  };
}

// Calculate risk score from analysis
function calculateRiskScore(analysis: AuditResult['analysis']): { score: number; level: RiskLevel; flags: string[] } {
  let score = 0;
  const flags: string[] = [];

  if (analysis.honeypot) {
    score += 50;
    flags.push('Honeypot detected - tokens cannot be sold');
  }

  if (analysis.proxyPattern) {
    score += 20;
    flags.push('Proxy pattern detected - upgradeable contract');
  }

  if (analysis.mintFunction) {
    score += 15;
    flags.push('Mint function present - supply can be inflated');
  }

  if (analysis.hiddenOwner) {
    score += 10;
    flags.push('Owner privileges detected');
  }

  if (analysis.suspiciousTransfers) {
    score += 25;
    flags.push('Suspicious transfer patterns detected');
  }

  if (analysis.unlimitedApproval) {
    score += 15;
    flags.push('Unlimited approval pattern - token could drain wallets');
  }

  // Cap at 100
  score = Math.min(100, score);

  let level: RiskLevel;
  if (score >= 80) level = 'critical';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';
  else if (score >= 20) level = 'low';
  else level = 'safe';

  return { score, level, flags };
}

// Generate recommendations based on analysis
function generateRecommendations(analysis: AuditResult['analysis']): string[] {
  const recs: string[] = [];

  if (analysis.honeypot) {
    recs.push('⚠️ DO NOT BUY - This appears to be a honeypot scam');
  }

  if (analysis.unlimitedApproval) {
    recs.push('🔒 Revoke token approvals after transactions using revoke.cash');
  }

  if (analysis.mintFunction) {
    recs.push('💰 Check tokenomics - large minting capability could devalue your holdings');
  }

  if (analysis.proxyPattern) {
    recs.push('🔄 Owner can upgrade contract without notice');
  }

  if (analysis.suspiciousTransfers) {
    recs.push('⚠️ High risk of fund loss - investigate further');
  }

  if (recs.length === 0) {
    recs.push('✅ Basic checks passed - still DYOR before investing');
  }

  return recs;
}

// POST /api/audit/contract - Audit a smart contract
router.post('/contract', async (req: Request, res: Response) => {
  try {
    const { address, chain = 'ethereum', bytecode } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Contract address is required' });
    }

    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    // For demo purposes, use provided bytecode or simulate analysis
    const code = bytecode || '0x608060405234801561001057600080fd5b50'; // Minimal placeholder
    
    // Analyze the contract
    const analysis = analyzeContractBytecode(code);
    const { score, level, flags } = calculateRiskScore(analysis);
    const recommendations = generateRecommendations(analysis);

    const result: AuditResult = {
      address,
      riskScore: score,
      riskLevel: level,
      flags,
      analysis,
      recommendations,
      analyzedAt: new Date().toISOString(),
    };

    // Store in database
    try {
      await pool.query(`
        INSERT INTO scam_reports (type, target_address, chain, risk_score, risk_level, flags, details, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        'contract_audit',
        address,
        chain,
        score,
        level,
        JSON.stringify(flags),
        JSON.stringify(analysis),
      ]);
    } catch (dbError) {
      console.log('DB not available, skipping storage:', dbError);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Contract audit error:', error);
    res.status(500).json({ error: 'Audit failed', details: String(error) });
  }
});

// POST /api/audit/wallet - Audit wallet reputation
router.post('/wallet', async (req: Request, res: Response) => {
  try {
    const { address, chain = 'ethereum' } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Validate address
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    // Simulated wallet analysis
    // In production, this would query blockchain explorers and databases
    
    const simulatedFlags: string[] = [];
    let riskScore = 0;

    // Simulate some checks
    const hash = address.toLowerCase().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    if (hash % 10 === 0) {
      riskScore += 30;
      simulatedFlags.push('Recently created wallet');
    }
    if (hash % 7 === 0) {
      riskScore += 20;
      simulatedFlags.push('Linked to known DeFi protocols');
    }
    if (hash % 5 === 0) {
      riskScore += 15;
      simulatedFlags.push('Has NFT activity');
    }

    riskScore = Math.min(100, riskScore);
    
    let riskLevel: RiskLevel;
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 60) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else if (riskScore >= 20) riskLevel = 'low';
    else riskLevel = 'safe';

    const result = {
      address,
      chain,
      riskScore,
      riskLevel,
      flags: simulatedFlags,
      transactionCount: Math.floor(Math.random() * 1000),
      age: `${Math.floor(Math.random() * 365)} days`,
      analyzedAt: new Date().toISOString(),
    };

    // Store in database
    try {
      await pool.query(`
        INSERT INTO scam_reports (type, target_address, chain, risk_score, risk_level, flags, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, ['wallet_audit', address, chain, riskScore, riskLevel, JSON.stringify(simulatedFlags)]);
    } catch (dbError) {
      console.log('DB not available, skipping storage');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Wallet audit error:', error);
    res.status(500).json({ error: 'Wallet audit failed', details: String(error) });
  }
});

// GET /api/audit/reports - Get audit reports (admin only)
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    let query = 'SELECT * FROM scam_reports';
    const params: any[] = [];
    
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/audit/report - Report a scam
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { 
      type, // 'contract' | 'wallet' | 'website'
      targetAddress,
      chain,
      description,
      reporterContact,
      evidence 
    } = req.body;

    if (!type || !targetAddress || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(`
      INSERT INTO scam_reports (
        type, target_address, chain, description, reporter_contact, evidence, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
      RETURNING id
    `, [type, targetAddress, chain || 'ethereum', description, reporterContact, JSON.stringify(evidence || {})]);

    res.json({
      success: true,
      reportId: result.rows[0].id,
      message: 'Report submitted successfully. Our team will investigate.',
    });
  } catch (error) {
    console.error('Report submission error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /api/audit/blacklist - Get known scam addresses
router.get('/blacklist', async (req: res) => {
  try {
    const result = await pool.query(`
      SELECT target_address, type, risk_level, flags, created_at 
      FROM scam_reports 
      WHERE risk_level IN ('high', 'critical')
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Blacklist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch blacklist' });
  }
});

export default router;
