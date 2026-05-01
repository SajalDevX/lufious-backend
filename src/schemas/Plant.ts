import { z } from 'zod';

export const HealthStatus = z.enum(['healthy', 'warning', 'critical']);
export type HealthStatus = z.infer<typeof HealthStatus>;

export const PlantDoc = z.object({
  _id: z.string(),
  userId: z.string(),
  nickname: z.string().min(1).max(64),
  species: z.string().min(1).max(128),
  photoUrl: z.string().url().optional().nullable(),
  locationTag: z.string().default('Living Room'),
  wateringIntervalDays: z.number().int().positive().default(7),
  fertilizingIntervalDays: z.number().int().positive().default(30),
  lastWatered: z.number().default(0),
  lastFertilized: z.number().default(0),
  addedAt: z.number(),
  healthStatus: HealthStatus.default('healthy')
});
export type PlantDoc = z.infer<typeof PlantDoc>;

export const PlantCreate = PlantDoc.pick({
  nickname: true,
  species: true,
  photoUrl: true,
  locationTag: true,
  wateringIntervalDays: true,
  fertilizingIntervalDays: true
}).partial({
  photoUrl: true,
  locationTag: true,
  wateringIntervalDays: true,
  fertilizingIntervalDays: true
});
export type PlantCreate = z.infer<typeof PlantCreate>;

export const PlantPatch = PlantCreate.extend({
  lastWatered: z.number().optional(),
  lastFertilized: z.number().optional(),
  healthStatus: HealthStatus.optional()
}).partial();
export type PlantPatch = z.infer<typeof PlantPatch>;

export const CareLogType = z.enum([
  'water',
  'fertilize',
  'prune',
  'repot',
  'note'
]);
export type CareLogType = z.infer<typeof CareLogType>;

export const CareLogDoc = z.object({
  _id: z.string(),
  userId: z.string(),
  plantId: z.string(),
  type: CareLogType,
  note: z.string().max(500).default(''),
  timestamp: z.number()
});
export type CareLogDoc = z.infer<typeof CareLogDoc>;

export const CareLogCreate = CareLogDoc.pick({
  type: true,
  note: true
}).partial({ note: true });
export type CareLogCreate = z.infer<typeof CareLogCreate>;
