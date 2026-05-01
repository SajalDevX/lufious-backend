import { listPlants, pickNeedsWater } from './plantService.js';
import { getUser } from './userService.js';
import type { PlantDoc } from '../schemas/Plant.js';
import type { UserDoc } from '../schemas/User.js';

export type HomeDashboard = {
  user: UserDoc | null;
  totalPlants: number;
  needsWater: PlantDoc[];
  recentPlants: PlantDoc[];
  weather: null;
  aiTip: null;
  weatherAlertsCount: number;
};

export async function getHomeDashboard(uid: string): Promise<HomeDashboard> {
  const [user, plants] = await Promise.all([getUser(uid), listPlants(uid)]);
  const needsWater = pickNeedsWater(plants);
  const recentPlants = plants.slice(0, 5);
  return {
    user,
    totalPlants: plants.length,
    needsWater,
    recentPlants,
    weather: null,
    aiTip: null,
    weatherAlertsCount: 0
  };
}
