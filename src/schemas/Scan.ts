import { z } from 'zod';

export const ScanDoc = z.object({
  _id: z.string(),
  userId: z.string(),
  speciesName: z.string().default(''),
  commonName: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0),
  healthStatus: z.enum(['healthy', 'warning', 'critical']).default('healthy'),
  diagnosis: z.string().default(''),
  carePlan: z.string().default(''),
  photoUrl: z.string().url().optional().nullable(),
  timestamp: z.number()
});
export type ScanDoc = z.infer<typeof ScanDoc>;

export const ScanCreate = z.object({
  photoUrl: z.string().url()
});
export type ScanCreate = z.infer<typeof ScanCreate>;
