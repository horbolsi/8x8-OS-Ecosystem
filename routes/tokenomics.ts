import { Router, type Express, type Response } from 'express';

const router = Router();

const ALLOCATION = Object.freeze({
  miners: 0.30,
  stakers: 0.20,
  storage: 0.10,
  treasury: 0.20,
  ecosystem: 0.20,
});

function gated(res: Response, action: string) {
  return res.status(403).json({
    success: false,
    code: 'PUBLIC_DEMO_GATED',
    action,
    truth_class: 'LIVE',
    message: 'Payments, subscriptions, revenue mutation, and profit distribution are disabled in the public companion.',
  });
}

router.get('/allocation', (_req, res) => {
  res.json({ allocation: ALLOCATION, total: 1, truth_class: 'SIMULATED' });
});

router.get('/payment/networks', (_req, res) => {
  res.json({ networks: [], truth_class: 'SIMULATED', message: 'No payment addresses are exposed in the public companion.' });
});

router.get('/payment/status/:txHash', (_req, res) => {
  res.status(404).json({ error: 'Payment processing is not available in the public companion.', truth_class: 'LIVE' });
});

router.get('/subscription', (_req, res) => {
  res.json({ active: false, tier: null, truth_class: 'SIMULATED' });
});

router.get('/user/:userId/earnings', (_req, res) => {
  res.json({ earnings: [], total_earned: 0, truth_class: 'SIMULATED' });
});

for (const path of ['/payment/intent', '/payment/confirm', '/admin/revenue', '/calculate']) {
  router.post(path, (_req, res) => gated(res, path));
}

export default router;

export const registerTokenomicsRoutes = (app: Express) => {
  app.use('/tokenomics', router);
};
