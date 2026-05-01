import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import {
  addToWishlist,
  getWishlist,
  getWishlistListings,
  removeFromWishlist
} from '../services/wishlistService.js';

export const wishlist = new Hono<AuthCtx>();
wishlist.use('*', requireAuth);

wishlist.get('/', async (c) => {
  const items = await getWishlistListings(c.get('uid'));
  const wl = await getWishlist(c.get('uid'));
  return c.json({ items, listingIds: wl.listingIds });
});

wishlist.post('/:listingId', async (c) => {
  const wl = await addToWishlist(c.get('uid'), c.req.param('listingId'));
  return c.json(wl);
});

wishlist.delete('/:listingId', async (c) => {
  const wl = await removeFromWishlist(c.get('uid'), c.req.param('listingId'));
  return c.json(wl);
});
