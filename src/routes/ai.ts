import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { getTip } from '../services/aiTipService.js';

export const ai = new Hono<AuthCtx>();
ai.use('*', requireAuth);

ai.get('/tips', async (c) => {
  const tip = await getTip(c.get('uid'));
  return c.json(tip);
});
