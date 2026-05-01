import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: 'validation_error', issues: err.issues }, 400);
  }
  const maybeStatus = (err as unknown as { status?: number }).status;
  const status =
    typeof maybeStatus === 'number'
      ? (maybeStatus as 400 | 401 | 403 | 404 | 500)
      : 500;
  console.error('[error]', err);
  return c.json({ error: err.message || 'internal_error' }, status);
};
