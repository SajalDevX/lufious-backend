import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { registerToken } from '../lib/fcm.js';

const Body = z.object({ token: z.string().min(1) });

export const devices = new Hono<AuthCtx>();
devices.use('*', requireAuth);

devices.post('/fcm', async (c) => {
  const body = Body.parse(await c.req.json());
  await registerToken(c.get('uid'), body.token);
  return c.body(null, 204);
});
