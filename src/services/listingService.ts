import { ObjectId, type Filter } from 'mongodb';
import { getDb } from '../lib/mongo.js';
import {
  ListingDoc,
  type ListingCreate,
  type ListingPatch,
  type ListingQuery
} from '../schemas/Listing.js';

const LISTINGS = 'listings';

export type ListingPage = {
  items: ListingDoc[];
  page: number;
  size: number;
  total: number;
};

export async function listListings(q: ListingQuery): Promise<ListingPage> {
  const db = await getDb();
  const filter: Filter<ListingDoc> = { status: q.status ?? 'active' };
  if (q.sellerId) filter.sellerId = q.sellerId;
  if (q.category) filter.category = q.category;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const range: Record<string, number> = {};
    if (q.minPrice !== undefined) range.$gte = q.minPrice;
    if (q.maxPrice !== undefined) range.$lte = q.maxPrice;
    filter.price = range as unknown as ListingDoc['price'];
  }
  if (q.q) {
    const safe = q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  const skip = (q.page - 1) * q.size;
  const cursor = db
    .collection<ListingDoc>(LISTINGS)
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(q.size);
  const [items, total] = await Promise.all([
    cursor.toArray(),
    db.collection<ListingDoc>(LISTINGS).countDocuments(filter)
  ]);
  return { items, page: q.page, size: q.size, total };
}

export async function getListing(id: string): Promise<ListingDoc | null> {
  const db = await getDb();
  return db.collection<ListingDoc>(LISTINGS).findOne({ _id: id });
}

export async function createListing(
  sellerId: string,
  input: ListingCreate
): Promise<ListingDoc> {
  const db = await getDb();
  const now = Date.now();
  const doc = ListingDoc.parse({
    _id: new ObjectId().toHexString(),
    sellerId,
    title: input.title,
    description: input.description ?? '',
    price: input.price,
    category: input.category,
    photoUrl: input.photoUrl ?? null,
    currency: 'INR',
    createdAt: now,
    updatedAt: now,
    status: 'active'
  });
  await db.collection<ListingDoc>(LISTINGS).insertOne(doc);
  return doc;
}

export async function patchListing(
  sellerId: string,
  id: string,
  patch: ListingPatch
): Promise<ListingDoc | null> {
  const db = await getDb();
  const $set: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) $set[k] = v;
  }
  const res = await db
    .collection<ListingDoc>(LISTINGS)
    .findOneAndUpdate(
      { _id: id, sellerId },
      { $set },
      { returnDocument: 'after' }
    );
  return res ?? null;
}

export async function deleteListing(
  sellerId: string,
  id: string
): Promise<boolean> {
  const db = await getDb();
  const res = await db
    .collection<ListingDoc>(LISTINGS)
    .deleteOne({ _id: id, sellerId });
  return (res.deletedCount ?? 0) > 0;
}

export async function getListingsByIds(ids: string[]): Promise<ListingDoc[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .collection<ListingDoc>(LISTINGS)
    .find({ _id: { $in: ids } })
    .toArray();
}
