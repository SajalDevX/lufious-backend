import { z } from 'zod';

export const ExperienceLevel = z.enum(['beginner', 'intermediate', 'expert']);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

export const HHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:mm');

export const UserDoc = z.object({
  _id: z.string(), // firebase uid
  email: z.string().email(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  fcmTokens: z.array(z.string()).default([]),
  provider: z.enum(['email', 'google', 'facebook', 'apple']).default('email'),
  lat: z.number().optional(),
  lon: z.number().optional(),
  timezone: z.string().optional(),
  locale: z.string().default('en'),
  experienceLevel: ExperienceLevel.default('beginner'),
  wateringReminderTime: HHmm.default('09:00'),
  followedCategories: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number()
});
export type UserDoc = z.infer<typeof UserDoc>;

export const NotificationPrefsDoc = z.object({
  _id: z.string(), // userId
  watering: z.boolean().default(true),
  scanReady: z.boolean().default(true),
  newListing: z.boolean().default(true),
  wishlist: z.boolean().default(true),
  quietHoursStart: HHmm.optional(),
  quietHoursEnd: HHmm.optional()
});
export type NotificationPrefsDoc = z.infer<typeof NotificationPrefsDoc>;

export const ProfilePatch = z.object({
  displayName: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(64).optional(),
  photoUrl: z.string().url().nullable().optional(),
  phone: z.string().optional().nullable(),
  experienceLevel: ExperienceLevel.optional(),
  wateringReminderTime: HHmm.optional(),
  followedCategories: z.array(z.string()).optional()
});
export type ProfilePatch = z.infer<typeof ProfilePatch>;
