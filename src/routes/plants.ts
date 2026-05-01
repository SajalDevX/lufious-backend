import { Hono } from 'hono';
import { requireAuth, type AuthCtx } from '../middleware/auth.js';
import {
  CareLogCreate,
  PlantCreate,
  PlantPatch
} from '../schemas/Plant.js';
import {
  addLog,
  createPlant,
  deletePlant,
  getPlant,
  listLogs,
  listPlants,
  patchPlant
} from '../services/plantService.js';

export const plants = new Hono<AuthCtx>();
plants.use('*', requireAuth);

plants.get('/', async (c) => {
  const uid = c.get('uid');
  const items = await listPlants(uid);
  return c.json({ items });
});

plants.post('/', async (c) => {
  const uid = c.get('uid');
  const body = PlantCreate.parse(await c.req.json());
  const plant = await createPlant(uid, body);
  return c.json(plant, 201);
});

plants.get('/:id', async (c) => {
  const uid = c.get('uid');
  const plant = await getPlant(uid, c.req.param('id'));
  if (!plant) return c.json({ error: 'not_found' }, 404);
  return c.json(plant);
});

plants.patch('/:id', async (c) => {
  const uid = c.get('uid');
  const body = PlantPatch.parse(await c.req.json());
  const plant = await patchPlant(uid, c.req.param('id'), body);
  if (!plant) return c.json({ error: 'not_found' }, 404);
  return c.json(plant);
});

plants.delete('/:id', async (c) => {
  const uid = c.get('uid');
  const ok = await deletePlant(uid, c.req.param('id'));
  if (!ok) return c.json({ error: 'not_found' }, 404);
  return c.body(null, 204);
});

plants.get('/:id/logs', async (c) => {
  const uid = c.get('uid');
  const items = await listLogs(uid, c.req.param('id'));
  return c.json({ items });
});

plants.post('/:id/logs', async (c) => {
  const uid = c.get('uid');
  const body = CareLogCreate.parse(await c.req.json());
  const log = await addLog(uid, c.req.param('id'), body);
  if (!log) return c.json({ error: 'plant_not_found' }, 404);
  return c.json(log, 201);
});
