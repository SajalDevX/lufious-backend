import { Hono } from 'hono';
import { requireCronSecret } from '../middleware/cron.js';
import { runWateringReminders } from '../services/notificationService.js';
import { getDb } from '../lib/mongo.js';
import type { ScanDoc } from '../schemas/Scan.js';
import type { UserDoc } from '../schemas/User.js';

export const cron = new Hono();
cron.use('*', requireCronSecret);

cron.post('/watering-reminders', async (c) => {
  const result = await runWateringReminders();
  return c.json(result);
});

cron.post('/prune-scans', async (c) => {
  const db = await getDb();
  const users = await db
    .collection<UserDoc>('users')
    .find({}, { projection: { _id: 1 } })
    .toArray();
  let pruned = 0;
  for (const u of users) {
    const keep = await db
      .collection<ScanDoc>('scans')
      .find({ userId: u._id })
      .sort({ timestamp: -1 })
      .skip(50)
      .project({ _id: 1 })
      .toArray();
    if (keep.length === 0) continue;
    const ids = keep.map((d) => d._id);
    const r = await db
      .collection<ScanDoc>('scans')
      .deleteMany({ _id: { $in: ids } });
    pruned += r.deletedCount ?? 0;
  }
  return c.json({ pruned });
});
