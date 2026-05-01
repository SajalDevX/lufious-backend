import { getEnv } from './env.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const env = getEnv();
  const key = env.OPENROUTER_API_KEY;
  if (!key) {
    throw Object.assign(new Error('llm_not_configured'), { status: 503 });
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://lufious.ai',
      'X-Title': 'Lufious'
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages,
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 220
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`openrouter ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('openrouter empty response');
  return out;
}
