import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { mintSignedUpload } from '../lib/storage.js';

const SignBody = z.object({
  kind: z.enum(['plant', 'scan', 'listing', 'profile']),
  refId: z.string().optional(),
  contentType: z.string().optional()
});

export const uploads = new Hono<AuthCtx>();
uploads.use('*', requireAuth);

uploads.post('/sign', async (c) => {
  const body = SignBody.parse(await c.req.json());
  const result = await mintSignedUpload(
    c.get('uid'),
    body.kind,
    body.refId,
    body.contentType
  );
  return c.json(result);
});
