import { getDb } from '../lib/mongo.js';
import {
  NotificationPrefsDoc,
  UserDoc,
  type ProfilePatch
} from '../schemas/User.js';

const USERS = 'users';
const PREFS = 'notificationPrefs';

export async function syncUser(input: {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  provider: UserDoc['provider'];
}): Promise<UserDoc> {
  const db = await getDb();
  const now = Date.now();

  const existing = await db.collection<UserDoc>(USERS).findOne({ _id: input.uid });
  if (existing) {
    const updated: UserDoc = {
      ...existing,
      email: input.email,
      name: input.name ?? existing.name,
      displayName: existing.displayName ?? input.name,
      photoUrl: input.picture ?? existing.photoUrl ?? null,
      provider: input.provider,
      updatedAt: now
    };
    await db.collection<UserDoc>(USERS).replaceOne({ _id: input.uid }, updated);
    return updated;
  }

  const created = UserDoc.parse({
    _id: input.uid,
    email: input.email,
    name: input.name,
    displayName: input.name,
    photoUrl: input.picture ?? null,
    provider: input.provider,
    fcmTokens: [],
    locale: 'en',
    experienceLevel: 'beginner',
    wateringReminderTime: '09:00',
    followedCategories: [],
    createdAt: now,
    updatedAt: now
  });
  await db.collection<UserDoc>(USERS).insertOne(created);

  const prefs = NotificationPrefsDoc.parse({ _id: input.uid });
  await db
    .collection<NotificationPrefsDoc>(PREFS)
    .updateOne({ _id: input.uid }, { $setOnInsert: prefs }, { upsert: true });

  return created;
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>(USERS).findOne({ _id: uid });
}

export async function patchUser(
  uid: string,
  patch: ProfilePatch
): Promise<UserDoc | null> {
  const db = await getDb();
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) update[k] = v;
  }
  await db.collection<UserDoc>(USERS).updateOne({ _id: uid }, { $set: update });
  return getUser(uid);
}
