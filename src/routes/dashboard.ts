import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { getHomeDashboard } from '../services/dashboardService.js';

export const dashboard = new Hono<AuthCtx>();
dashboard.use('*', requireAuth);

dashboard.get('/home', async (c) => {
  const uid = c.get('uid');
  const data = await getHomeDashboard(uid);
  return c.json(data);
});
