import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import {
  ListingCreate,
  ListingPatch,
  ListingQuery
} from '../schemas/Listing.js';
import {
  createListing,
  deleteListing,
  getListing,
  listListings,
  patchListing
} from '../services/listingService.js';

export const listings = new Hono<AuthCtx>();
listings.use('*', requireAuth);

listings.get('/', async (c) => {
  const q = ListingQuery.parse(Object.fromEntries(new URL(c.req.url).searchParams));
  const page = await listListings(q);
  return c.json(page);
});

listings.post('/', async (c) => {
  const body = ListingCreate.parse(await c.req.json());
  const doc = await createListing(c.get('uid'), body);
  return c.json(doc, 201);
});

listings.get('/:id', async (c) => {
  const doc = await getListing(c.req.param('id'));
  if (!doc) return c.json({ error: 'not_found' }, 404);
  return c.json(doc);
});

listings.patch('/:id', async (c) => {
  const body = ListingPatch.parse(await c.req.json());
  const doc = await patchListing(c.get('uid'), c.req.param('id'), body);
  if (!doc) return c.json({ error: 'not_found' }, 404);
  return c.json(doc);
});

listings.delete('/:id', async (c) => {
  const ok = await deleteListing(c.get('uid'), c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});
