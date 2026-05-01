import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { health } from '../src/routes/health.js';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const app = new Hono();
    app.route('/api/health', health);
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
  });
});
