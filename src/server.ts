import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { env } from './lib/env.js';
import { ensureIndexes } from './lib/mongo.js';
import { errorHandler } from './middleware/errors.js';
import { auth as authRoutes } from './routes/auth.js';
import { dashboard } from './routes/dashboard.js';
import { health } from './routes/health.js';
import { plants } from './routes/plants.js';
import { scans } from './routes/scans.js';
import { uploads } from './routes/uploads.js';

const app = new Hono();

app.onError(errorHandler);

app.route('/api/health', health);
app.route('/api/auth', authRoutes);
app.route('/api/plants', plants);
app.route('/api/scans', scans);
app.route('/api/uploads', uploads);
app.route('/api/dashboard', dashboard);

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
