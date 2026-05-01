import { z } from 'zod';

const Schema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().default('lufious'),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  OPENWEATHER_KEY: z.string().optional(),
  PLANTNET_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('google/gemini-1.5-flash'),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional()
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = Schema.parse(process.env);
  return cached;
}

// Backwards-compat lazy proxy: `env.X` reads on access.
export const env: Env = new Proxy({} as Env, {
  get(_t, prop: string) {
    return getEnv()[prop as keyof Env];
  }
});
