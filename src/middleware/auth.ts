import type { Context, MiddlewareHandler, Next } from 'hono';
import { adminAuth } from '../lib/firebaseAdmin.js';

export type AuthCtx = {
  Variables: {
    uid: string;
    email: string | null;
  };
};

const cache = new Map<string, { uid: string; email: string | null; exp: number }>();
const TTL = 5 * 60 * 1000;

export const requireAuth: MiddlewareHandler<AuthCtx> = async (
  c: Context<AuthCtx>,
  next: Next
) => {
  const header = c.req.header('authorization') || c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'missing_token' }, 401);
  }
  const token = header.slice(7).trim();

  const cached = cache.get(token);
  if (cached && cached.exp > Date.now()) {
    c.set('uid', cached.uid);
    c.set('email', cached.email);
    return next();
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    cache.set(token, {
      uid: decoded.uid,
      email: decoded.email ?? null,
      exp: Date.now() + TTL
    });
    c.set('uid', decoded.uid);
    c.set('email', decoded.email ?? null);
    return next();
  } catch {
    return c.json({ error: 'invalid_token' }, 401);
  }
};
