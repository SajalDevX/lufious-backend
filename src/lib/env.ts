import { z } from 'zod';

const Schema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().default('lufious'),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1),
  FIREBASE_STORAGE_BUCKET: z.string().min(1),
  OPENWEATHER_KEY: z.string().optional(),
  PLANTNET_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('google/gemini-1.5-flash'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional()
});

export const env = Schema.parse(process.env);
export type Env = z.infer<typeof Schema>;
