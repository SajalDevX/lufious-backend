import { getWeather, type WeatherSummary } from '../lib/weather.js';
import { listPlants, pickNeedsWater } from './plantService.js';
import { getTip } from './aiTipService.js';
import { getUser } from './userService.js';
import type { PlantDoc } from '../schemas/Plant.js';
import type { UserDoc } from '../schemas/User.js';

export type HomeDashboard = {
  user: UserDoc | null;
  totalPlants: number;
  needsWater: PlantDoc[];
  recentPlants: PlantDoc[];
  weather: WeatherSummary | null;
  aiTip: { content: string } | null;
  weatherAlertsCount: number;
};

export async function getHomeDashboard(uid: string): Promise<HomeDashboard> {
  const [user, plants] = await Promise.all([getUser(uid), listPlants(uid)]);
  const needsWater = pickNeedsWater(plants);
  const recentPlants = plants.slice(0, 5);

  let weather: WeatherSummary | null = null;
  if (user?.lat != null && user.lon != null) {
    weather = await getWeather(user.lat, user.lon).catch(() => null);
  }

  const aiTip = await getTip(uid).catch(() => null);

  return {
    user,
    totalPlants: plants.length,
    needsWater,
    recentPlants,
    weather,
    aiTip,
    weatherAlertsCount: weather?.alerts.length ?? 0
  };
}
