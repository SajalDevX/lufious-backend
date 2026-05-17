import { getDb } from './mongo.js';
import { getEnv } from './env.js';

export type DailyForecast = {
  dt: number;
  tempMin: number | null;
  tempMax: number | null;
  description: string | null;
  icon: string | null;
};

export type WeatherSummary = {
  temp: number | null;
  description: string | null;
  icon: string | null;
  humidity: number | null;
  windKph: number | null;
  uvi: number | null;
  daily: DailyForecast[];
  alerts: Array<{ event: string; description: string; start: number; end: number }>;
  fetchedAt: number;
};

const CURRENT_ENDPOINT = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast';
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
  if (cached && cached.payload.temp != null) return cached.payload;

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
    humidity: null,
    windKph: null,
    uvi: null,
    daily: [],
    alerts: [],
    fetchedAt: Date.now()
  };
  if (!key) return fallback;

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrent(lat, lon, key),
      fetchForecastDaily(lat, lon, key)
    ]);
    return {
      ...current,
      daily: forecast,
      alerts: [],
      fetchedAt: Date.now()
    };
  } catch {
    return fallback;
  }
}

type CurrentSlice = Omit<WeatherSummary, 'daily' | 'alerts' | 'fetchedAt'>;

async function fetchCurrent(lat: number, lon: number, key: string): Promise<CurrentSlice> {
  const empty: CurrentSlice = {
    temp: null, description: null, icon: null, humidity: null, windKph: null, uvi: null
  };
  const url = new URL(CURRENT_ENDPOINT);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('appid', key);
  url.searchParams.set('units', 'metric');
  const res = await fetch(url);
  if (!res.ok) return empty;
  const data = (await res.json()) as {
    main?: { temp?: number; humidity?: number };
    weather?: Array<{ description?: string; icon?: string }>;
    wind?: { speed?: number };
  };
  const windMs = data.wind?.speed;
  return {
    temp: data.main?.temp ?? null,
    description: data.weather?.[0]?.description ?? null,
    icon: data.weather?.[0]?.icon ?? null,
    humidity: data.main?.humidity ?? null,
    windKph: windMs != null ? Math.round(windMs * 3.6) : null,
    uvi: null
  };
}

async function fetchForecastDaily(lat: number, lon: number, key: string): Promise<DailyForecast[]> {
  const url = new URL(FORECAST_ENDPOINT);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('appid', key);
  url.searchParams.set('units', 'metric');
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    list?: Array<{
      dt: number;
      main?: { temp_min?: number; temp_max?: number };
      weather?: Array<{ description?: string; icon?: string }>;
    }>;
  };
  // Group 3-hour slots by local date, pick min/max + a representative midday entry.
  const byDay = new Map<string, {
    dt: number;
    tempMin: number | null;
    tempMax: number | null;
    description: string | null;
    icon: string | null;
  }>();
  for (const slot of data.list ?? []) {
    const date = new Date(slot.dt * 1000);
    const key = date.toISOString().slice(0, 10);
    const existing = byDay.get(key);
    const tMin = slot.main?.temp_min ?? null;
    const tMax = slot.main?.temp_max ?? null;
    if (!existing) {
      byDay.set(key, {
        dt: slot.dt * 1000,
        tempMin: tMin,
        tempMax: tMax,
        description: slot.weather?.[0]?.description ?? null,
        icon: slot.weather?.[0]?.icon ?? null
      });
    } else {
      if (tMin != null) existing.tempMin = existing.tempMin == null ? tMin : Math.min(existing.tempMin, tMin);
      if (tMax != null) existing.tempMax = existing.tempMax == null ? tMax : Math.max(existing.tempMax, tMax);
      // Prefer noon slot for representative icon/description.
      if (date.getUTCHours() === 12 || existing.description == null) {
        existing.description = slot.weather?.[0]?.description ?? existing.description;
        existing.icon = slot.weather?.[0]?.icon ?? existing.icon;
        existing.dt = slot.dt * 1000;
      }
    }
  }
  return Array.from(byDay.values()).slice(0, 7);
}
