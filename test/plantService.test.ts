import { describe, it, expect } from 'vitest';
import { isWateringDue, pickNeedsWater } from '../src/services/plantService.js';
import type { PlantDoc } from '../src/schemas/Plant.js';

const day = 24 * 60 * 60 * 1000;

function plant(p: Partial<PlantDoc>): PlantDoc {
  return {
    _id: 'p',
    userId: 'u',
    nickname: 'X',
    species: 'Y',
    photoUrl: null,
    locationTag: 'Living Room',
    wateringIntervalDays: 7,
    fertilizingIntervalDays: 30,
    lastWatered: 0,
    lastFertilized: 0,
    addedAt: 0,
    healthStatus: 'healthy',
    ...p
  };
}

describe('isWateringDue', () => {
  const now = 1_000_000_000_000;
  it('due when lastWatered=0', () => {
    expect(isWateringDue(plant({ lastWatered: 0 }), now)).toBe(true);
  });
  it('due when interval elapsed', () => {
    const p = plant({ wateringIntervalDays: 2, lastWatered: now - 3 * day });
    expect(isWateringDue(p, now)).toBe(true);
  });
  it('not due when within interval', () => {
    const p = plant({ wateringIntervalDays: 7, lastWatered: now - 1 * day });
    expect(isWateringDue(p, now)).toBe(false);
  });
});

describe('pickNeedsWater', () => {
  const now = Date.now();
  it('includes warning + critical regardless of timing', () => {
    const xs = [
      plant({ _id: 'a', healthStatus: 'warning', lastWatered: now }),
      plant({ _id: 'b', healthStatus: 'critical', lastWatered: now }),
      plant({ _id: 'c', healthStatus: 'healthy', lastWatered: now })
    ];
    const ids = pickNeedsWater(xs).map((p) => p._id);
    expect(ids).toEqual(['a', 'b']);
  });
  it('includes overdue healthy plants', () => {
    const xs = [
      plant({
        _id: 'overdue',
        healthStatus: 'healthy',
        wateringIntervalDays: 1,
        lastWatered: now - 5 * day
      })
    ];
    expect(pickNeedsWater(xs)).toHaveLength(1);
  });
});
