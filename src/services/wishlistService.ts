import { getDb } from '../lib/mongo.js';
import { WishlistDoc } from '../schemas/Wishlist.js';
import { getListingsByIds } from './listingService.js';
import type { ListingDoc } from '../schemas/Listing.js';

const WISHLISTS = 'wishlists';

export async function getWishlist(userId: string): Promise<WishlistDoc> {
  const db = await getDb();
  const doc = await db.collection<WishlistDoc>(WISHLISTS).findOne({ _id: userId });
  return doc ?? { _id: userId, listingIds: [], updatedAt: 0 };
}

export async function getWishlistListings(
  userId: string
): Promise<ListingDoc[]> {
  const wl = await getWishlist(userId);
  return getListingsByIds(wl.listingIds);
}

export async function addToWishlist(
  userId: string,
  listingId: string
): Promise<WishlistDoc> {
  const db = await getDb();
  await db
    .collection<WishlistDoc>(WISHLISTS)
    .updateOne(
      { _id: userId },
      {
        $addToSet: { listingIds: listingId },
        $set: { updatedAt: Date.now() }
      },
      { upsert: true }
    );
  return getWishlist(userId);
}

export async function removeFromWishlist(
  userId: string,
  listingId: string
): Promise<WishlistDoc> {
  const db = await getDb();
  await db
    .collection<WishlistDoc>(WISHLISTS)
    .updateOne(
      { _id: userId },
      {
        $pull: { listingIds: listingId },
        $set: { updatedAt: Date.now() }
      }
    );
  return getWishlist(userId);
}
