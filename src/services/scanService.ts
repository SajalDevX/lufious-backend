import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import { identifyPlant } from '../lib/plantNet.js';
import { ScanDoc } from '../schemas/Scan.js';
import { notifyScanReady } from './notificationService.js';

const SCANS = 'scans';
const RETENTION = 50;

export async function createScan(
  userId: string,
  photoUrl: string
): Promise<ScanDoc> {
  const id = new ObjectId().toHexString();
  const ident = await identifyPlant(photoUrl);
  const now = Date.now();

  const doc = ScanDoc.parse({
    _id: id,
    userId,
    speciesName: ident.speciesName,
    commonName: ident.commonName,
    confidence: ident.confidence,
    healthStatus: 'healthy',
    diagnosis:
      ident.confidence < 0.4
        ? 'Low-confidence match. Try a closer photo of a single leaf in good light.'
        : `Identified as ${ident.commonName} (${ident.speciesName}).`,
    carePlan:
      'Water when the top inch of soil is dry. Bright indirect light. Mist for humidity.',
    photoUrl,
    timestamp: now
  });

  const db = await getDb();
  await db.collection<ScanDoc>(SCANS).insertOne(doc);
  await pruneOld(userId);
  void notifyScanReady(userId, doc._id, doc.commonName || doc.speciesName).catch(
    (err) => console.error('[scan] notify failed', err)
  );
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
