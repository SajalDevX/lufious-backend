import { getDb } from '../lib/mongo.js';
import { chat } from '../lib/openrouter.js';
import { listPlants } from './plantService.js';
import { getUser } from './userService.js';
import { getWeather } from '../lib/weather.js';

const TIPS = 'aiTips';
const TTL_MS = 6 * 60 * 60 * 1000;

type TipDoc = {
  _id: string; // userId
  content: string;
  generatedAt: number;
  expiresAt: Date;
};

const FALLBACK = 'Check soil moisture before watering: stick a finger one inch deep — water only if dry. Most houseplants prefer drying out slightly between waterings.';

export async function getTip(uid: string): Promise<{ content: string }> {
  const db = await getDb();
  const cached = await db.collection<TipDoc>(TIPS).findOne({ _id: uid });
  if (cached && cached.expiresAt.getTime() > Date.now()) {
    return { content: cached.content };
  }

  const content = await generateTip(uid).catch(() => FALLBACK);
  await db.collection<TipDoc>(TIPS).updateOne(
    { _id: uid },
    {
      $set: {
        _id: uid,
        content,
        generatedAt: Date.now(),
        expiresAt: new Date(Date.now() + TTL_MS)
      }
    },
    { upsert: true }
  );
  return { content };
}

async function generateTip(uid: string): Promise<string> {
  const [user, plants] = await Promise.all([getUser(uid), listPlants(uid)]);
  const speciesList = plants.slice(0, 12).map((p) => `${p.nickname} (${p.species})`).join(', ');
  let weatherLine = '';
  if (user?.lat != null && user.lon != null) {
    const w = await getWeather(user.lat, user.lon).catch(() => null);
    if (w) {
      weatherLine = `Local weather: ${w.description ?? 'n/a'}, ${w.temp ?? 'n/a'}°C.`;
    }
  }
  const experience = user?.experienceLevel ?? 'beginner';
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are Lufious, a concise plant-care assistant. Output exactly one care tip in 2 short sentences (max 220 chars). No headings, no bullet points, no emoji.'
    },
    {
      role: 'user' as const,
      content: `Gardener level: ${experience}. Plants in garden: ${speciesList || 'none yet'}. ${weatherLine} Give one specific actionable tip for today.`
    }
  ];
  return chat(messages, { temperature: 0.7, maxTokens: 220 });
}
