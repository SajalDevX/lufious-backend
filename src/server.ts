import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './lib/env.js';
import { ensureIndexes } from './lib/mongo.js';
import { errorHandler } from './middleware/errors.js';
import { auth as authRoutes } from './routes/auth.js';
import { health } from './routes/health.js';

const app = new Hono();

app.onError(errorHandler);

app.route('/api/health', health);
app.route('/api/auth', authRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));

async function bootstrap(): Promise<void> {
  await ensureIndexes();
  serve({ fetch: app.fetch, port: env.PORT }, ({ port }) => {
    console.log(`[lufious-backend] listening on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[bootstrap] failed', err);
  process.exit(1);
});

export { app };
