import { pushToUser } from '../lib/fcm.js';
import { getDb } from '../lib/mongo.js';
import { isWateringDue } from './plantService.js';
import type { NotificationPrefsDoc, UserDoc } from '../schemas/User.js';
import type { PlantDoc } from '../schemas/Plant.js';
import type { ListingDoc } from '../schemas/Listing.js';
import type { WishlistDoc } from '../schemas/Wishlist.js';

function inQuietHours(prefs: NotificationPrefsDoc, hhmm: string): boolean {
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;
  if (!start || !end) return false;
  if (start <= end) return hhmm >= start && hhmm < end;
  return hhmm >= start || hhmm < end;
}

function localHHmm(date: Date, timezone: string | undefined): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone ?? 'UTC'
    });
    return fmt.format(date);
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

/**
 * Run hourly. Pushes a watering reminder to users whose local
 * `wateringReminderTime` falls in the current hour bucket and
 * who have at least one plant with watering overdue.
 */
export async function runWateringReminders(now = new Date()): Promise<{
  notified: number;
  scanned: number;
}> {
  const db = await getDb();
  const users = await db.collection<UserDoc>('users').find({}).toArray();
  let notified = 0;
  let scanned = 0;

  for (const user of users) {
    scanned += 1;
    const prefs =
      (await db
        .collection<NotificationPrefsDoc>('notificationPrefs')
        .findOne({ _id: user._id })) ??
      ({
        _id: user._id,
        watering: true,
        scanReady: true,
        newListing: true,
        wishlist: true
      } as NotificationPrefsDoc);

    if (!prefs.watering) continue;

    const hhmm = localHHmm(now, user.timezone);
    const reminder = user.wateringReminderTime ?? '09:00';
    if (hhmm.slice(0, 2) !== reminder.slice(0, 2)) continue;
    if (inQuietHours(prefs, hhmm)) continue;

    const plants = await db
      .collection<PlantDoc>('plants')
      .find({ userId: user._id })
      .toArray();
    const due = plants.filter((p) => isWateringDue(p, now.getTime()));
    if (due.length === 0) continue;

    const sample = due
      .slice(0, 3)
      .map((p) => p.nickname)
      .join(', ');
    const remainder = due.length > 3 ? ` +${due.length - 3} more` : '';
    await pushToUser(user._id, {
      title: 'Time to water your plants',
      body: `${due.length} plant${due.length === 1 ? '' : 's'} due today: ${sample}${remainder}`,
      data: { type: 'watering_reminder' }
    });
    notified += 1;
  }
  return { notified, scanned };
}

export async function notifyScanReady(uid: string, scanId: string, speciesName: string): Promise<void> {
  const db = await getDb();
  const prefs = await db
    .collection<NotificationPrefsDoc>('notificationPrefs')
    .findOne({ _id: uid });
  if (prefs && prefs.scanReady === false) return;
  await pushToUser(uid, {
    title: 'Plant identified',
    body: speciesName ? `We identified your scan: ${speciesName}` : 'Your scan result is ready',
    data: { type: 'scan_ready', scanId }
  });
}

export async function fanoutNewListing(listing: ListingDoc): Promise<number> {
  const db = await getDb();
  const followers = await db
    .collection<UserDoc>('users')
    .find({ followedCategories: listing.category })
    .toArray();
  let count = 0;
  for (const u of followers) {
    if (u._id === listing.sellerId) continue;
    const prefs = await db
      .collection<NotificationPrefsDoc>('notificationPrefs')
      .findOne({ _id: u._id });
    if (prefs && prefs.newListing === false) continue;
    await pushToUser(u._id, {
      title: `New ${listing.category} listing`,
      body: listing.title,
      data: { type: 'new_listing', listingId: listing._id }
    });
    count += 1;
  }
  return count;
}

export async function fanoutWishlistChange(
  listing: ListingDoc,
  change: 'price_drop' | 'sold'
): Promise<number> {
  const db = await getDb();
  const wishlists = await db
    .collection<WishlistDoc>('wishlists')
    .find({ listingIds: listing._id })
    .toArray();
  let count = 0;
  for (const wl of wishlists) {
    if (wl._id === listing.sellerId) continue;
    const prefs = await db
      .collection<NotificationPrefsDoc>('notificationPrefs')
      .findOne({ _id: wl._id });
    if (prefs && prefs.wishlist === false) continue;
    const title =
      change === 'sold' ? 'Wishlist item sold' : 'Wishlist price drop';
    await pushToUser(wl._id, {
      title,
      body: listing.title,
      data: { type: change, listingId: listing._id }
    });
    count += 1;
  }
  return count;
}
