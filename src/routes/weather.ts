import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { getWeather } from '../lib/weather.js';

const Q = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180)
});

export const weather = new Hono<AuthCtx>();
weather.use('*', requireAuth);

weather.get('/', async (c) => {
  const { lat, lon } = Q.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const data = await getWeather(lat, lon);
  return c.json(data);
});
