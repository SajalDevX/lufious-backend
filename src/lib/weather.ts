import { getDb } from './mongo.js';
import { getEnv } from './env.js';

export type WeatherSummary = {
  temp: number | null;
  description: string | null;
  icon: string | null;
  alerts: Array<{ event: string; description: string; start: number; end: number }>;
  fetchedAt: number;
};

const ENDPOINT = 'https://api.openweathermap.org/data/3.0/onecall';
const TTL_MS = 60 * 60 * 1000;

function bucketKey(lat: number, lon: number): string {
  const hour = Math.floor(Date.now() / TTL_MS);
  return `${lat.toFixed(3)}:${lon.toFixed(3)}:${hour}`;
}

export async function getWeather(
  lat: number,
  lon: number
): Promise<WeatherSummary> {
  const db = await getDb();
  const cache = db.collection<{ _id: string; payload: WeatherSummary; expiresAt: Date }>('weatherCache');
  const key = bucketKey(lat, lon);

  const cached = await cache.findOne({ _id: key });
  if (cached) return cached.payload;

  const summary = await fetchFromProvider(lat, lon);
  await cache.updateOne(
    { _id: key },
    { $set: { _id: key, payload: summary, expiresAt: new Date(Date.now() + TTL_MS) } },
    { upsert: true }
  );
  return summary;
}

async function fetchFromProvider(
  lat: number,
  lon: number
): Promise<WeatherSummary> {
  const key = getEnv().OPENWEATHER_KEY;
  const fallback: WeatherSummary = {
    temp: null,
    description: null,
    icon: null,
    alerts: [],
    fetchedAt: Date.now()
  };
  if (!key) return fallback;

  const url = new URL(ENDPOINT);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('appid', key);
  url.searchParams.set('units', 'metric');
  url.searchParams.set('exclude', 'minutely,hourly,daily');

  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      current?: {
        temp?: number;
        weather?: Array<{ description?: string; icon?: string }>;
      };
      alerts?: Array<{ event: string; description: string; start: number; end: number }>;
    };
    return {
      temp: data.current?.temp ?? null,
      description: data.current?.weather?.[0]?.description ?? null,
      icon: data.current?.weather?.[0]?.icon ?? null,
      alerts: (data.alerts ?? []).map((a) => ({
        event: a.event,
        description: a.description,
        start: a.start * 1000,
        end: a.end * 1000
      })),
      fetchedAt: Date.now()
    };
  } catch {
    return fallback;
  }
}
