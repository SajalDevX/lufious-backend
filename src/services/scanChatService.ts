import { getDb } from '../lib/mongo.js';
import { chat, type ChatMessage } from '../lib/openrouter.js';
import { ScanDoc, type ScanMessage } from '../schemas/Scan.js';

const SCANS = 'scans';
const HISTORY_LIMIT = 20;
const MESSAGE_CAP = 100;
const VISION_MODEL = 'google/gemini-1.5-flash';

const FALLBACK_SEED =
  "I'm having trouble reaching my analysis service right now, but I can still help. " +
  'What would you like to know about your plant — watering, light, or something else?';

const FALLBACK_REPLY =
  "I couldn't reach my analysis service for that reply. Could you ask again in a moment?";

const SYSTEM_PROMPT =
  'You are Lufious, a calm and friendly plant-care expert. Give short, specific, ' +
  'practical answers (no more than 4 short paragraphs). Speak in plain language; ' +
  'avoid bullet salads. When you do not know, say so.';

function seedSystemPrompt(scan: ScanDoc): string {
  return (
    SYSTEM_PROMPT +
    '\n\nYou are looking at a photo a user just took of their plant. ' +
    "PlantNet's best guess is " +
    `"${scan.commonName || scan.speciesName || 'unknown'}" ` +
    `(scientific: "${scan.speciesName || 'unknown'}", confidence: ${(scan.confidence ?? 0).toFixed(2)}). ` +
    'Use the image to confirm or correct, then write ONE warm, conversational message that:\n' +
    '1. Confirms the species in one sentence (or corrects PlantNet if the image clearly disagrees).\n' +
    '2. Notes 2-3 specific things you SEE in the photo (leaf colour, posture, soil, signs of stress).\n' +
    '3. Lists the most important 2-3 care priorities for this plant.\n' +
    '4. Ends with ONE friendly question inviting the user to share more (e.g. where it lives, how long they have had it).\n' +
    'Keep it under ~180 words.'
  );
}

function followupSystemPrompt(scan: ScanDoc): string {
  return (
    SYSTEM_PROMPT +
    `\n\nThe user is asking about a "${scan.commonName || scan.speciesName || 'plant'}" ` +
    `(scientific: "${scan.speciesName || 'unknown'}", initial identification confidence ${(scan.confidence ?? 0).toFixed(2)}). ` +
    'Keep all advice anchored to this specific plant.'
  );
}

export async function seedAnalysis(scan: ScanDoc): Promise<ScanMessage> {
  const photoUrl = scan.photoUrl;
  const now = Date.now();
  if (!photoUrl) {
    return { role: 'assistant', content: FALLBACK_SEED, createdAt: now };
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: seedSystemPrompt(scan) },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Here is the plant photo. Please analyse it and reply.' },
        { type: 'image_url', image_url: { url: photoUrl } }
      ]
    }
  ];

  try {
    const reply = await chat(messages, {
      model: VISION_MODEL,
      temperature: 0.6,
      maxTokens: 380
    });
    return { role: 'assistant', content: reply, createdAt: now };
  } catch (err) {
    console.error('[scanChat] seedAnalysis failed', err);
    return { role: 'assistant', content: FALLBACK_SEED, createdAt: now };
  }
}

export async function appendUserMessage(
  uid: string,
  scanId: string,
  content: string
): Promise<{ user: ScanMessage; assistant: ScanMessage }> {
  const db = await getDb();
  const scan = await db
    .collection<ScanDoc>(SCANS)
    .findOne({ _id: scanId, userId: uid });
  if (!scan) {
    throw Object.assign(new Error('scan_not_found'), { status: 404 });
  }

  const userMsg: ScanMessage = {
    role: 'user',
    content,
    createdAt: Date.now()
  };

  const history: ScanMessage[] = (scan.messages ?? []).slice(-HISTORY_LIMIT);

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: followupSystemPrompt(scan) },
    ...history.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
    { role: 'user', content }
  ];

  let assistantContent = FALLBACK_REPLY;
  try {
    assistantContent = await chat(llmMessages, { temperature: 0.55, maxTokens: 320 });
  } catch (err) {
    console.error('[scanChat] appendUserMessage chat failed', err);
  }

  const assistantMsg: ScanMessage = {
    role: 'assistant',
    content: assistantContent,
    createdAt: Date.now()
  };

  await db.collection<ScanDoc>(SCANS).updateOne(
    { _id: scanId, userId: uid },
    {
      $push: {
        messages: {
          $each: [userMsg, assistantMsg],
          $slice: -MESSAGE_CAP
        }
      }
    }
  );

  return { user: userMsg, assistant: assistantMsg };
}
