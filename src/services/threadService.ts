import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import {
  MessageDoc,
  ThreadDoc,
  type MessageCreate,
  type ThreadCreate
} from '../schemas/Thread.js';

const THREADS = 'threads';
const MESSAGES = 'messages';

function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function listThreads(uid: string): Promise<ThreadDoc[]> {
  const db = await getDb();
  return db
    .collection<ThreadDoc>(THREADS)
    .find({ participants: uid })
    .sort({ lastMessageAt: -1 })
    .toArray();
}

export async function getThread(
  uid: string,
  id: string
): Promise<ThreadDoc | null> {
  const db = await getDb();
  return db
    .collection<ThreadDoc>(THREADS)
    .findOne({ _id: id, participants: uid });
}

export async function findOrCreateThread(
  uid: string,
  input: ThreadCreate
): Promise<ThreadDoc> {
  if (input.recipientId === uid) {
    throw new Error('cannot DM yourself');
  }
  const db = await getDb();
  const [a, b] = pairKey(uid, input.recipientId);
  const filter: Record<string, unknown> = { participants: { $all: [a, b] } };
  if (input.listingId) filter.listingId = input.listingId;
  else filter.listingId = { $in: [null, undefined] };

  const existing = await db.collection<ThreadDoc>(THREADS).findOne(filter);
  if (existing) return existing;

  const now = Date.now();
  const doc = ThreadDoc.parse({
    _id: new ObjectId().toHexString(),
    participants: [a, b],
    listingId: input.listingId ?? null,
    lastMessage: '',
    lastMessageAt: now,
    lastSenderId: null,
    unread: { [a]: 0, [b]: 0 },
    createdAt: now
  });
  await db.collection<ThreadDoc>(THREADS).insertOne(doc);
  return doc;
}

export async function listMessages(
  uid: string,
  threadId: string,
  before?: number,
  limit = 50
): Promise<MessageDoc[]> {
  const thread = await getThread(uid, threadId);
  if (!thread) throw Object.assign(new Error('thread_not_found'), { status: 404 });
  const db = await getDb();
  const filter: Record<string, unknown> = { threadId };
  if (before) filter.createdAt = { $lt: before };
  return db
    .collection<MessageDoc>(MESSAGES)
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function postMessage(
  uid: string,
  threadId: string,
  input: MessageCreate
): Promise<MessageDoc> {
  const thread = await getThread(uid, threadId);
  if (!thread) throw Object.assign(new Error('thread_not_found'), { status: 404 });

  const db = await getDb();
  const now = Date.now();
  const msg = MessageDoc.parse({
    _id: new ObjectId().toHexString(),
    threadId,
    senderId: uid,
    body: input.body,
    createdAt: now
  });
  await db.collection<MessageDoc>(MESSAGES).insertOne(msg);

  const other = thread.participants.find((p) => p !== uid)!;
  await db
    .collection<ThreadDoc>(THREADS)
    .updateOne(
      { _id: threadId },
      {
        $set: {
          lastMessage: msg.body,
          lastMessageAt: now,
          lastSenderId: uid,
          [`unread.${uid}`]: 0
        },
        $inc: { [`unread.${other}`]: 1 }
      }
    );
  return msg;
}

export async function markRead(
  uid: string,
  threadId: string
): Promise<ThreadDoc | null> {
  const thread = await getThread(uid, threadId);
  if (!thread) return null;
  const db = await getDb();
  await db
    .collection<ThreadDoc>(THREADS)
    .updateOne({ _id: threadId }, { $set: { [`unread.${uid}`]: 0 } });
  return getThread(uid, threadId);
}
