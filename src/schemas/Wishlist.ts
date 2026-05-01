import { z } from 'zod';

export const WishlistDoc = z.object({
  _id: z.string(), // userId
  listingIds: z.array(z.string()).default([]),
  updatedAt: z.number().default(0)
});
export type WishlistDoc = z.infer<typeof WishlistDoc>;
