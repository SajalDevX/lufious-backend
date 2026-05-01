import { Hono } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/mongo.js';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import {
  NotificationPrefsDoc,
  ProfilePatch,
  type UserDoc as UserDocType
} from '../schemas/User.js';
import type { NotificationPrefsDoc as PrefsDocType } from '../schemas/User.js';
import { getUser, patchUser } from '../services/userService.js';

const LocationBody = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  timezone: z.string().optional()
});

const PrefsPatch = z.object({
  watering: z.boolean().optional(),
  scanReady: z.boolean().optional(),
  newListing: z.boolean().optional(),
  wishlist: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
});

const CategoriesBody = z.object({
  followedCategories: z.array(z.string())
});

export const me = new Hono<AuthCtx>();
me.use('*', requireAuth);

me.get('/profile', async (c) => {
  const user = await getUser(c.get('uid'));
  if (!user) return c.json({ error: 'not_found' }, 404);
  return c.json(user);
});

me.patch('/profile', async (c) => {
  const body = ProfilePatch.parse(await c.req.json());
  const user = await patchUser(c.get('uid'), body);
  if (!user) return c.json({ error: 'not_found' }, 404);
  return c.json(user);
});

me.patch('/location', async (c) => {
  const body = LocationBody.parse(await c.req.json());
  const db = await getDb();
  await db.collection<UserDocType>('users').updateOne(
    { _id: c.get('uid') },
    {
      $set: {
        lat: body.lat,
        lon: body.lon,
        ...(body.timezone ? { timezone: body.timezone } : {}),
        updatedAt: Date.now()
      }
    }
  );
  return c.body(null, 204);
});

me.get('/preferences', async (c) => {
  const db = await getDb();
  const prefs = await db
    .collection<PrefsDocType>('notificationPrefs')
    .findOne({ _id: c.get('uid') });
  return c.json(prefs ?? NotificationPrefsDoc.parse({ _id: c.get('uid') }));
});

me.patch('/preferences', async (c) => {
  const body = PrefsPatch.parse(await c.req.json());
  const db = await getDb();
  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined) $set[k] = v;
  }
  if (Object.keys($set).length > 0) {
    await db
      .collection<PrefsDocType>('notificationPrefs')
      .updateOne({ _id: c.get('uid') }, { $set }, { upsert: true });
  }
  const prefs = await db
    .collection<PrefsDocType>('notificationPrefs')
    .findOne({ _id: c.get('uid') });
  return c.json(prefs);
});

me.patch('/categories', async (c) => {
  const body = CategoriesBody.parse(await c.req.json());
  const db = await getDb();
  await db
    .collection<UserDocType>('users')
    .updateOne(
      { _id: c.get('uid') },
      { $set: { followedCategories: body.followedCategories, updatedAt: Date.now() } }
    );
  return c.body(null, 204);
});
