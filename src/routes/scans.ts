import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { ScanCreate } from '../schemas/Scan.js';
import {
  createScan,
  getScan,
  listScans
} from '../services/scanService.js';

export const scans = new Hono<AuthCtx>();
scans.use('*', requireAuth);

scans.get('/', async (c) => {
  const items = await listScans(c.get('uid'));
  return c.json({ items });
});

scans.post('/', async (c) => {
  const body = ScanCreate.parse(await c.req.json());
  const scan = await createScan(c.get('uid'), body.photoUrl);
  return c.json(scan, 201);
});

scans.get('/:id', async (c) => {
  const scan = await getScan(c.get('uid'), c.req.param('id'));
  if (!scan) return c.json({ error: 'not_found' }, 404);
  return c.json(scan);
});
