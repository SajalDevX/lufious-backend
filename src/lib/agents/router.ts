import { ALL_AGENT_KEYS, type AgentKey } from './types.js';
import { listAgents } from './definitions.js';

const ALIAS_MAP: Map<string, AgentKey> = (() => {
  const m = new Map<string, AgentKey>();
  for (const a of listAgents()) {
    m.set(a.key, a.key);
    for (const alias of a.aliases) m.set(alias.toLowerCase(), a.key);
  }
  return m;
})();

const MENTION_RE = /@([a-zA-Z][a-zA-Z0-9_-]{1,24})/g;

export function parseMentions(content: string): AgentKey[] {
  const found = new Set<AgentKey>();
  for (const m of content.matchAll(MENTION_RE)) {
    const raw = m[1];
    if (!raw) continue;
    const key = ALIAS_MAP.get(raw.toLowerCase());
    if (key) found.add(key);
  }
  return [...found];
}

/**
 * Resolve which agents should reply to a user message.
 * Falls back to the "care" generalist when no @mention is present.
 */
export function resolveResponders(content: string): AgentKey[] {
  const mentioned = parseMentions(content);
  if (mentioned.length === 0) return ['care'];
  if (mentioned.length === 1 && (mentioned[0] as string) === 'all') {
    return [...ALL_AGENT_KEYS];
  }
  return mentioned;
}

export function stripMentions(content: string): string {
  return content.replace(MENTION_RE, '').replace(/\s+/g, ' ').trim();
}
