import { Hono } from 'hono';
import { adminAuth } from '../lib/firebaseAdmin.js';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import { syncUser } from '../services/userService.js';
import type { UserDoc } from '../schemas/User.js';

export const auth = new Hono<AuthCtx>();

auth.use('*', requireAuth);

auth.post('/sync', async (c) => {
  const uid = c.get('uid');
  const fbUser = await adminAuth().getUser(uid);

  const provider = pickProvider(fbUser.providerData[0]?.providerId);
  const user = await syncUser({
    uid,
    email: fbUser.email ?? c.get('email') ?? '',
    name: fbUser.displayName ?? undefined,
    picture: fbUser.photoURL ?? undefined,
    provider
  });
  return c.json(user);
});

function pickProvider(id: string | undefined): UserDoc['provider'] {
  switch (id) {
    case 'google.com':
      return 'google';
    case 'facebook.com':
      return 'facebook';
    case 'apple.com':
      return 'apple';
    default:
      return 'email';
  }
}
