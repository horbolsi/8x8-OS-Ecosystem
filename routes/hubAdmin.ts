import type { Express } from 'express';
import {
  findUserByToken, getAllUsers, updateUserRole, banUser,
  getUserPermissions, setPermission, removePermission,
  getPlans, upsertPlan, deletePlan,
  getAllSubscriptions, grantFreeSubscription,
  getAllSettings, setSetting,
  getEvents, createEvent, updateEvent, deleteEvent,
} from '../hub-db.js';

async function requireRole(req: any, res: any, minRoles: string[]): Promise<any | null> {
  const token = req.headers['x-hub-token'] as string;
  if (!token) { res.status(401).json({ error: 'No token' }); return null; }
  const user = await findUserByToken(token);
  if (!user) { res.status(401).json({ error: 'Invalid token' }); return null; }
  if (!minRoles.includes(user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return null; }
  return user;
}

export function registerHubAdminRoutes(app: Express) {

  // ── Users ────────────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/users', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/users/:id/role', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      const { role } = req.body;
      const allowed = ['user', 'moderator', 'admin', 'owner'];
      if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      const updated = await updateUserRole(parseInt(req.params.id), role);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/users/:id/ban', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const updated = await banUser(parseInt(req.params.id), req.body.banned === true);
      res.json(updated);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Permissions ───────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/users/:id/permissions', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const perms = await getUserPermissions(parseInt(req.params.id));
      res.json(perms);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hub/admin/users/:id/permissions', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const { feature, can_access, can_edit } = req.body;
      await setPermission(parseInt(req.params.id), feature, can_access !== false, can_edit === true, caller.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/hub/admin/users/:id/permissions/:feature', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      await removePermission(parseInt(req.params.id), req.params.feature);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Plans ─────────────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/plans', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const plans = await getPlans();
      res.json(plans);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hub/admin/plans', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      const plan = await upsertPlan(null, req.body);
      res.json(plan);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/plans/:id', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      const plan = await upsertPlan(parseInt(req.params.id), req.body);
      res.json(plan);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/hub/admin/plans/:id', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      await deletePlan(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Subscriptions ─────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/subscriptions', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const subs = await getAllSubscriptions();
      res.json(subs);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hub/admin/users/:id/grant-subscription', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const days = parseInt(req.body.days || '30');
      const sub = await grantFreeSubscription(parseInt(req.params.id), days, caller.id);
      res.json(sub);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Settings ──────────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/settings', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const settings = await getAllSettings();
      res.json(settings);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/settings', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: 'key required' });
      await setSetting(key, value, caller.id);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/settings/bulk', async (req, res) => {
    const caller = await requireRole(req, res, ['owner']);
    if (!caller) return;
    try {
      const { settings } = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await setSetting(key, value, caller.id);
      }
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Events ────────────────────────────────────────────────────────────────────
  app.get('/api/hub/admin/events', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin', 'moderator']);
    if (!caller) return;
    try {
      const events = await getEvents();
      res.json(events);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/hub/admin/events', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin', 'moderator']);
    if (!caller) return;
    try {
      const event = await createEvent(req.body, caller.id);
      res.json(event);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.patch('/api/hub/admin/events/:id', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin', 'moderator']);
    if (!caller) return;
    try {
      const event = await updateEvent(parseInt(req.params.id), req.body);
      res.json(event);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete('/api/hub/admin/events/:id', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin', 'moderator']);
    if (!caller) return;
    try {
      await deleteEvent(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Admin Stats Overview ───────────────────────────────────────────────────────
  app.get('/api/hub/admin/overview', async (req, res) => {
    const caller = await requireRole(req, res, ['owner', 'admin']);
    if (!caller) return;
    try {
      const [users, subs, plans, settings] = await Promise.all([
        getAllUsers(),
        getAllSubscriptions(),
        getPlans(),
        getAllSettings(),
      ]);
      res.json({
        totalUsers: users.length,
        activeSubscriptions: subs.filter((s: any) => s.status === 'active').length,
        totalPlans: plans.length,
        bannedUsers: users.filter((u: any) => u.is_banned).length,
        ownerCount: users.filter((u: any) => u.role === 'owner').length,
        adminCount: users.filter((u: any) => u.role === 'admin').length,
        moderatorCount: users.filter((u: any) => u.role === 'moderator').length,
        userCount: users.filter((u: any) => u.role === 'user').length,
        freeDailyMinutes: settings.free_daily_minutes || 60,
        hubName: settings.hub_name || 'Pioneer Hub',
      });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });
}
