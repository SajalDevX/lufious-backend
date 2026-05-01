import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { MessageCreate, ThreadCreate } from '../schemas/Thread.js';
import {
  findOrCreateThread,
  listMessages,
  listThreads,
  markRead,
  postMessage
} from '../services/threadService.js';

export const threads = new Hono<AuthCtx>();
threads.use('*', requireAuth);

threads.get('/', async (c) => {
  const items = await listThreads(c.get('uid'));
  return c.json({ items });
});

threads.post('/', async (c) => {
  const body = ThreadCreate.parse(await c.req.json());
  const thread = await findOrCreateThread(c.get('uid'), body);
  return c.json(thread, 201);
});

threads.get('/:id/messages', async (c) => {
  const before = c.req.query('before');
  const items = await listMessages(
    c.get('uid'),
    c.req.param('id'),
    before ? Number(before) : undefined
  );
  return c.json({ items });
});

threads.post('/:id/messages', async (c) => {
  const body = MessageCreate.parse(await c.req.json());
  const msg = await postMessage(c.get('uid'), c.req.param('id'), body);
  return c.json(msg, 201);
});

threads.post('/:id/read', async (c) => {
  const t = await markRead(c.get('uid'), c.req.param('id'));
  if (!t) return c.json({ error: 'not_found' }, 404);
  return c.json(t);
});
