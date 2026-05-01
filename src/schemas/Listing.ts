import { z } from 'zod';

export const ListingCategory = z.enum([
  'produce',
  'seeds',
  'soil',
  'tools',
  'pesticides'
]);
export type ListingCategory = z.infer<typeof ListingCategory>;

export const ListingStatus = z.enum(['active', 'sold', 'archived']);
export type ListingStatus = z.infer<typeof ListingStatus>;

export const ListingDoc = z.object({
  _id: z.string(),
  sellerId: z.string(),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(''),
  price: z.number().nonnegative(),
  category: ListingCategory,
  photoUrl: z.string().url().optional().nullable(),
  currency: z.literal('INR').default('INR'),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  status: ListingStatus.default('active')
});
export type ListingDoc = z.infer<typeof ListingDoc>;

export const ListingCreate = ListingDoc.pick({
  title: true,
  description: true,
  price: true,
  category: true,
  photoUrl: true
}).partial({ description: true, photoUrl: true });
export type ListingCreate = z.infer<typeof ListingCreate>;

export const ListingPatch = ListingCreate.extend({
  status: ListingStatus.optional()
}).partial();
export type ListingPatch = z.infer<typeof ListingPatch>;

export const ListingQuery = z.object({
  category: ListingCategory.optional(),
  q: z.string().min(1).max(120).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sellerId: z.string().optional(),
  status: ListingStatus.optional()
});
export type ListingQuery = z.infer<typeof ListingQuery>;
