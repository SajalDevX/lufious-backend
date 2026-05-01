import type { MiddlewareHandler } from 'hono';
import { getEnv } from '../lib/env.js';

export const requireCronSecret: MiddlewareHandler = async (c, next) => {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return c.json({ error: 'cron_disabled' }, 503);
  const provided = c.req.header('x-cron-secret');
  if (provided !== secret) return c.json({ error: 'forbidden' }, 403);
  return next();
};
