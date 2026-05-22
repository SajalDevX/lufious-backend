import { getDb } from '../lib/mongo.js';
import { runInitialAnalysis, runFollowup, type PriorMessage } from '../lib/agents/runner.js';
import { resolveResponders, stripMentions } from '../lib/agents/router.js';
import { getAgent } from '../lib/agents/definitions.js';
import { ScanDoc, type ScanMessage } from '../schemas/Scan.js';

const SCANS = 'scans';
const HISTORY_LIMIT = 40;
const MESSAGE_CAP = 200;

function prefix(agentKey: ScanMessage['agentKey'], content: string): string {
  if (!agentKey) return content;
  const a = getAgent(agentKey);
  return `${a.emoji} **${a.name}** — ${content}`;
}

/**
 * Initial fan-out: run all 4 agents in parallel against the image, persist
 * each response as a separate assistant message tagged with its agentKey.
 * Returns the resulting messages so caller can write them in one update.
 */
export async function seedAnalysis(scan: ScanDoc): Promise<ScanMessage[]> {
  const replies = await runInitialAnalysis(scan.photoUrl);
  const now = Date.now();
  return replies.map<ScanMessage>((r, i) => ({
    role: 'assistant',
    agentKey: r.agentKey,
    content: prefix(r.agentKey, r.content),
    createdAt: now + i
  }));
}

export interface FollowupResult {
  user: ScanMessage;
  replies: ScanMessage[];
}

/**
 * Handle a user followup. Parses @mentions, runs matching agents in parallel,
 * persists user message + agent replies atomically.
 */
export async function appendUserMessage(
  uid: string,
  scanId: string,
  rawContent: string
): Promise<FollowupResult> {
  const db = await getDb();
  const scan = await db
    .collection<ScanDoc>(SCANS)
    .findOne({ _id: scanId, userId: uid });
  if (!scan) {
    throw Object.assign(new Error('scan_not_found'), { status: 404 });
  }

  const targets = resolveResponders(rawContent);
  const promptText = stripMentions(rawContent) || rawContent;

  const now = Date.now();
  const userMsg: ScanMessage = {
    role: 'user',
    content: rawContent,
    mentions: targets,
    createdAt: now
  };

  const history: PriorMessage[] = (scan.messages ?? [])
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role,
      content: m.content,
      agentKey: m.agentKey
    }));

  const replies = await runFollowup(targets, history, promptText, scan.photoUrl);
  const replyMsgs: ScanMessage[] = replies.map((r, i) => ({
    role: 'assistant',
    agentKey: r.agentKey,
    content: prefix(r.agentKey, r.content),
    createdAt: now + 1 + i
  }));

  await db.collection<ScanDoc>(SCANS).updateOne(
    { _id: scanId, userId: uid },
    {
      $push: {
        messages: {
          $each: [userMsg, ...replyMsgs],
          $slice: -MESSAGE_CAP
        }
      }
    }
  );

  return { user: userMsg, replies: replyMsgs };
}
