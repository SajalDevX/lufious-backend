import { ObjectId } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import {
  CareLogDoc,
  PlantDoc,
  type CareLogCreate,
  type CareLogType,
  type PlantCreate,
  type PlantPatch
} from '../schemas/Plant.js';

const PLANTS = 'plants';
const LOGS = 'careLogs';

export async function listPlants(userId: string): Promise<PlantDoc[]> {
  const db = await getDb();
  return db
    .collection<PlantDoc>(PLANTS)
    .find({ userId })
    .sort({ addedAt: -1 })
    .toArray();
}

export async function getPlant(
  userId: string,
  id: string
): Promise<PlantDoc | null> {
  const db = await getDb();
  return db.collection<PlantDoc>(PLANTS).findOne({ _id: id, userId });
}

export async function createPlant(
  userId: string,
  input: PlantCreate
): Promise<PlantDoc> {
  const db = await getDb();
  const now = Date.now();
  const doc = PlantDoc.parse({
    _id: new ObjectId().toHexString(),
    userId,
    addedAt: now,
    lastWatered: now,
    lastFertilized: 0,
    healthStatus: 'healthy',
    locationTag: 'Living Room',
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    photoUrl: null,
    ...input
  });
  await db.collection<PlantDoc>(PLANTS).insertOne(doc);
  return doc;
}

export async function patchPlant(
  userId: string,
  id: string,
  patch: PlantPatch
): Promise<PlantDoc | null> {
  const db = await getDb();
  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  if (Object.keys($set).length > 0) {
    await db
      .collection<PlantDoc>(PLANTS)
      .updateOne({ _id: id, userId }, { $set });
  }
  return getPlant(userId, id);
}

export async function deletePlant(
  userId: string,
  id: string
): Promise<boolean> {
  const db = await getDb();
  const res = await db
    .collection<PlantDoc>(PLANTS)
    .deleteOne({ _id: id, userId });
  if (res.deletedCount > 0) {
    await db.collection<CareLogDoc>(LOGS).deleteMany({ userId, plantId: id });
    return true;
  }
  return false;
}

export async function addLog(
  userId: string,
  plantId: string,
  input: CareLogCreate
): Promise<CareLogDoc | null> {
  const db = await getDb();
  const plant = await getPlant(userId, plantId);
  if (!plant) return null;

  const now = Date.now();
  const log = CareLogDoc.parse({
    _id: new ObjectId().toHexString(),
    userId,
    plantId,
    type: input.type,
    note: input.note ?? '',
    timestamp: now
  });
  await db.collection<CareLogDoc>(LOGS).insertOne(log);

  const $set: Record<string, unknown> = {};
  if (log.type === 'water') $set.lastWatered = now;
  if (log.type === 'fertilize') $set.lastFertilized = now;
  if (Object.keys($set).length > 0) {
    await db
      .collection<PlantDoc>(PLANTS)
      .updateOne({ _id: plantId, userId }, { $set });
  }
  return log;
}

export async function listLogs(
  userId: string,
  plantId: string,
  limit = 50
): Promise<CareLogDoc[]> {
  const db = await getDb();
  return db
    .collection<CareLogDoc>(LOGS)
    .find({ userId, plantId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export function isWateringDue(plant: PlantDoc, now = Date.now()): boolean {
  if (!plant.lastWatered) return true;
  const dueAt =
    plant.lastWatered + plant.wateringIntervalDays * 24 * 60 * 60 * 1000;
  return now >= dueAt;
}

export function pickNeedsWater(plants: PlantDoc[]): PlantDoc[] {
  const now = Date.now();
  return plants.filter(
    (p) =>
      p.healthStatus === 'critical' ||
      p.healthStatus === 'warning' ||
      isWateringDue(p, now)
  );
}

export const CARE_LOG_TYPES: readonly CareLogType[] = [
  'water',
  'fertilize',
  'prune',
  'repot',
  'note'
];
