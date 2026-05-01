import { getMessaging } from 'firebase-admin/messaging';
import { adminApp } from './firebaseAdmin.js';
import { getDb } from './mongo.js';
import type { UserDoc } from '../schemas/User.js';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Send push to all FCM tokens registered on a user. Cleans up dead tokens.
 */
export async function pushToUser(
  uid: string,
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  const db = await getDb();
  const user = await db.collection<UserDoc>('users').findOne({ _id: uid });
  const tokens = user?.fcmTokens ?? [];
  if (tokens.length === 0) return { sent: 0, pruned: 0 };

  const messaging = getMessaging(adminApp());
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    android: { priority: 'high' }
  });

  const dead: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? '';
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-argument') ||
        code.includes('invalid-registration-token')
      ) {
        const t = tokens[i];
        if (t) dead.push(t);
      }
    }
  });

  let pruned = 0;
  if (dead.length > 0) {
    const upd = await db
      .collection<UserDoc>('users')
      .updateOne({ _id: uid }, { $pull: { fcmTokens: { $in: dead } } });
    pruned = upd.modifiedCount ?? 0;
  }
  return { sent: res.successCount, pruned };
}

export async function registerToken(uid: string, token: string): Promise<void> {
  const db = await getDb();
  await db.collection<UserDoc>('users').updateOne(
    { _id: uid },
    {
      $addToSet: { fcmTokens: token },
      $set: { updatedAt: Date.now() }
    }
  );
}
