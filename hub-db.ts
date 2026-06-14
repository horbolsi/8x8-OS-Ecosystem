import { pool } from './db.js';

// ====================== AUTH & USER ======================
export const findUserByToken = async (token: string) => {
  const result = await pool.query('SELECT * FROM hub_users WHERE session_token = $1', [token]);
  return result.rows[0] || null;
};

export const upsertUser = async (user: any) => {
  const result = await pool.query(
    `INSERT INTO hub_users (telegram_id, username, first_name, last_name, photo_url, session_token)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       photo_url = EXCLUDED.photo_url,
       session_token = EXCLUDED.session_token,
       updated_at = NOW()
     RETURNING *`,
    [user.telegram_id, user.username, user.first_name, user.last_name, user.photo_url, user.session_token]
  );
  return result.rows[0];
};

export const getUserPermissions = async (userId: number) => {
  const result = await pool.query('SELECT role FROM hub_users WHERE id = $1', [userId]);
  const role = result.rows[0]?.role || 'user';
  return { role, permissions: role === 'owner' ? ['all'] : role === 'admin' ? ['read', 'write', 'moderate'] : ['read'] };
};

export const promoteToOwnerBySecret = async (userId: number, secret: string) => {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) return null;
  const result = await pool.query('UPDATE hub_users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *', ['owner', userId]);
  return result.rows[0] || null;
};

export const getUserSubscription = async (userId: number) => {
  const result = await pool.query(
    'SELECT * FROM hub_subscriptions WHERE user_id = $1 AND status = $2 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1',
    [userId, 'active']
  );
  return result.rows[0] || null;
};

export const createSubscription = async (userId: number, planId: string, paymentRef: string, paymentToken: string, paymentAmount: number) => {
  const planResult = await pool.query('SELECT * FROM hub_plans WHERE id = $1', [planId]);
  const plan = planResult.rows[0];
  const durationDays = plan?.duration_days || 30;
  const result = await pool.query(
    "INSERT INTO hub_subscriptions (user_id, plan_id, status, payment_ref, payment_token, payment_amount, expires_at) VALUES ($1, $2, $3, $4, $5, $6, NOW() + MAKE_INTERVAL(days => $7)) RETURNING *",
    [userId, planId, "active", paymentRef, paymentToken, paymentAmount, durationDays]
  );
  await pool.query("UPDATE hub_users SET subscription_tier = $1, subscription_expires_at = NOW() + MAKE_INTERVAL(days => $2) WHERE id = $3", [planId, durationDays, userId]);
  return result.rows[0];
};

// ====================== SETTINGS ======================
export const getSetting = async (key: string) => {
  const result = await pool.query('SELECT value FROM hub_settings WHERE key = $1', [key]);
  return result.rows[0]?.value || null;
};

export const getAllSettings = async () => {
  const result = await pool.query('SELECT key, value FROM hub_settings');
  const settings: any = {};
  result.rows.forEach((r: any) => { settings[r.key] = r.value; });
  return settings;
};

// ====================== SESSION & USAGE ======================
export const addSessionUsage = async (userId: number, seconds: number) => {
  await pool.query(
    `INSERT INTO hub_session_usage (user_id, session_date, seconds_used)
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, session_date) DO UPDATE SET seconds_used = hub_session_usage.seconds_used + $2`,
    [userId, seconds]
  );
};

export const getSessionUsage = async (userId: number) => {
  const result = await pool.query('SELECT COALESCE(SUM(seconds_used), 0) as total FROM hub_session_usage WHERE user_id = $1 AND session_date = CURRENT_DATE', [userId]);
  return parseInt(result.rows[0]?.total || '0');
};

// ====================== EVENTS ======================
export const getEvents = async () => {
  const result = await pool.query('SELECT * FROM hub_events WHERE is_public = true ORDER BY created_at DESC LIMIT 50');
  return result.rows;
};

export const getActivePlans = async () => {
  const result = await pool.query('SELECT * FROM hub_plans WHERE is_active = true ORDER BY price ASC');
  return result.rows;
};

// ====================== ADMIN ======================
export const getAllUsers = async () => {
  const result = await pool.query('SELECT id, telegram_id, username, first_name, role, subscription_tier, is_banned, created_at FROM hub_users ORDER BY created_at DESC LIMIT 100');
  return result.rows;
};

export const banUser = async (userId: number) => {
  await pool.query('UPDATE hub_users SET is_banned = true, updated_at = NOW() WHERE id = $1', [userId]);
  return true;
};

// ====================== LEADERBOARD ======================
export const getLeaderboard = async (category = 'all', limit = 20) => {
  if (category === 'trading') {
    const result = await pool.query('SELECT user_id, SUM(amount) as score FROM hub_activity_feed WHERE activity_type = $1 GROUP BY user_id ORDER BY score DESC LIMIT $2', ['trade', limit]);
    return result.rows;
  }
  const result = await pool.query('SELECT user_id, COUNT(*) as score FROM hub_activity_feed GROUP BY user_id ORDER BY score DESC LIMIT $1', [limit]);
  return result.rows;
};

// ====================== ACTIVITY ======================
export const addActivity = async (userId: number | null, activityType: string, title: string, description: string, data: any = {}) => {
  await pool.query(
    'INSERT INTO hub_activity_feed (user_id, activity_type, title, description, data) VALUES ($1, $2, $3, $4, $5)',
    [userId, activityType, title, description, JSON.stringify(data)]
  );
};

export const getActivityFeed = async (limit = 50) => {
  const result = await pool.query('SELECT * FROM hub_activity_feed ORDER BY created_at DESC LIMIT $1', [limit]);
  return result.rows;
};
