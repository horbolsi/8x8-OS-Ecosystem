import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/leaderboard', async (req, res) => {
  res.json({ message: 'Leaderboard placeholder' });
});

export default router;

export const registerMiningRoutes = (app) => {
  app.use('/mining', router);
};
