import { getEnv } from './env.js';

export type PlantIdResult = {
  speciesName: string;
  commonName: string;
  confidence: number;
};

const ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all';

/**
 * Identify a plant from a public image URL using Pl@ntNet.
 * Returns mock data when PLANTNET_KEY is unset.
 */
export async function identifyPlant(photoUrl: string): Promise<PlantIdResult> {
  const key = getEnv().PLANTNET_KEY;
  if (!key) {
    return {
      speciesName: 'Monstera deliciosa',
      commonName: 'Swiss Cheese Plant',
      confidence: 0.0
    };
  }
  const url = new URL(ENDPOINT);
  url.searchParams.set('api-key', key);
  url.searchParams.set('images', photoUrl);
  url.searchParams.set('include-related-images', 'false');
  url.searchParams.set('no-reject', 'false');

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`plantnet ${res.status}`);
  }
  const data = (await res.json()) as {
    results?: Array<{
      score: number;
      species: {
        scientificNameWithoutAuthor: string;
        commonNames?: string[];
      };
    }>;
  };
  const best = data.results?.[0];
  if (!best) {
    return { speciesName: 'Unknown', commonName: 'Unknown', confidence: 0 };
  }
  return {
    speciesName: best.species.scientificNameWithoutAuthor,
    commonName: best.species.commonNames?.[0] ?? best.species.scientificNameWithoutAuthor,
    confidence: best.score
  };
}
