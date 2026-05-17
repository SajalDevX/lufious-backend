import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { ScanCreate, ScanMessageCreate } from '../schemas/Scan.js';
import {
  createScan,
  getScan,
  listScans
} from '../services/scanService.js';
import { appendUserMessage } from '../services/scanChatService.js';

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

scans.post('/:id/messages', async (c) => {
  const body = ScanMessageCreate.parse(await c.req.json());
  try {
    const pair = await appendUserMessage(
      c.get('uid'),
      c.req.param('id'),
      body.content
    );
    return c.json(pair);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 404) return c.json({ error: 'not_found' }, 404);
    throw err;
  }
});
