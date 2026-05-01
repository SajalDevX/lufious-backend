import { MongoClient, type Db } from 'mongodb';
import { getEnv } from './env.js';

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
}

let connected: Promise<MongoClient> | null = null;

function client(): MongoClient {
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(getEnv().MONGODB_URI, {
      maxPoolSize: 5
    });
  }
  return global.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const c = client();
  if (!connected) connected = c.connect();
  await connected;
  return c.db(getEnv().MONGODB_DB);
}

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }),
    db.collection('plants').createIndex({ userId: 1, addedAt: -1 }),
    db.collection('plants').createIndex({ userId: 1, lastWatered: 1 }),
    db.collection('careLogs').createIndex({ plantId: 1, timestamp: -1 }),
    db.collection('scans').createIndex({ userId: 1, timestamp: -1 }),
    db.collection('listings').createIndex({ category: 1, createdAt: -1 }),
    db.collection('listings').createIndex({ status: 1 }),
    db.collection('listings').createIndex({ sellerId: 1 }),
    db
      .collection('listings')
      .createIndex({ title: 'text', description: 'text' }),
    db.collection('threads').createIndex({ participants: 1 }),
    db.collection('threads').createIndex({ lastMessageAt: -1 }),
    db.collection('messages').createIndex({ threadId: 1, createdAt: -1 }),
    db
      .collection('aiTips')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db
      .collection('weatherCache')
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  ]);
}
