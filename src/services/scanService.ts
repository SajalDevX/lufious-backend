import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import { ScanDoc } from '../schemas/Scan.js';
import { notifyScanReady } from './notificationService.js';
import { seedAnalysis } from './scanChatService.js';

const SCANS = 'scans';
const RETENTION = 50;

export async function createScan(
  userId: string,
  photoUrl: string
): Promise<ScanDoc> {
  const id = new ObjectId().toHexString();
  const now = Date.now();

  // Insert immediately so POST /api/scans returns fast. The 4-agent fan-out
  // runs in the background and patches the doc with messages as they land.
  // The client transitions to the chat screen and polls getScan for updates.
  const doc = ScanDoc.parse({
    _id: id,
    userId,
    speciesName: '',
    commonName: '',
    confidence: 0,
    healthStatus: 'healthy',
    diagnosis: '',
    carePlan: '',
    photoUrl,
    messages: [],
    agentsReady: [],
    timestamp: now
  });

  const db = await getDb();
  await db.collection<ScanDoc>(SCANS).insertOne(doc);
  await pruneOld(userId);

  void (async () => {
    try {
      const seedMsgs = await seedAnalysis(doc);
      const agentsReady = seedMsgs
        .map((m) => m.agentKey)
        .filter((k): k is NonNullable<typeof k> => Boolean(k));
      await db.collection<ScanDoc>(SCANS).updateOne(
        { _id: id, userId },
        { $set: { messages: seedMsgs, agentsReady } }
      );
      void notifyScanReady(userId, id, '').catch((err) =>
        console.error('[scan] notify failed', err)
      );
    } catch (err) {
      console.error('[scan] background pipeline failed', err);
    }
  })();

  return doc;
}

export async function listScans(
  userId: string,
  limit = 50
): Promise<ScanDoc[]> {
  const db = await getDb();
  return db
    .collection<ScanDoc>(SCANS)
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export async function getScan(
  userId: string,
  id: string
): Promise<ScanDoc | null> {
  const db = await getDb();
  return db.collection<ScanDoc>(SCANS).findOne({ _id: id, userId });
}

export async function pruneOld(userId: string): Promise<number> {
  const db = await getDb();
  const keep = await db
    .collection<ScanDoc>(SCANS)
    .find({ userId })
    .sort({ timestamp: -1 })
    .skip(RETENTION)
    .project({ _id: 1 })
    .toArray();
  if (keep.length === 0) return 0;
  const ids = keep.map((d) => d._id);
  const res = await db
    .collection<ScanDoc>(SCANS)
    .deleteMany({ _id: { $in: ids } });
  return res.deletedCount ?? 0;
}
