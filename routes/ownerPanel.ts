import { Router } from 'express';
import { pool } from '../db.js';
import { isOwner } from '../middleware/ownerGuard.js';

const router = Router();

router.use(isOwner);

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, telegram_id, role, created_at FROM hub_users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/role', async (req, res) => {
  const { userId, role } = req.body;
  if (!userId || !role) return res.status(400).json({ error: 'Missing userId or role' });
  try {
    await pool.query('UPDATE hub_users SET role = $1 WHERE id = $2', [role, userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

export const registerOwnerPanelRoutes = (app) => {
  app.use('/owner', router);
};
