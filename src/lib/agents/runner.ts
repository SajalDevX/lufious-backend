import { chat, type ChatMessage } from '../openrouter.js';
import { getAgent, listAgents } from './definitions.js';
import type { AgentKey, AgentDefinition } from './types.js';

const PER_AGENT_HISTORY = 10;

export interface AgentReply {
  agentKey: AgentKey;
  content: string;
  ok: boolean;
}

export interface PriorMessage {
  role: 'user' | 'assistant';
  content: string;
  agentKey?: AgentKey;
}

/**
 * Build the LLM messages for a given agent's followup turn.
 * History slice keeps user messages + that agent's prior replies only.
 */
function buildAgentMessages(
  agent: AgentDefinition,
  history: PriorMessage[],
  userContent: string,
  photoUrl: string | null | undefined,
  isInitial: boolean
): ChatMessage[] {
  const sys: ChatMessage = {
    role: 'system',
    content: isInitial
      ? `${agent.systemPrompt}\n\n--- TASK ---\n${agent.initialInstructions}`
      : `${agent.systemPrompt}\n\n--- TASK ---\n${agent.followupInstructions}`
  };

  if (isInitial) {
    return [
      sys,
      {
        role: 'user',
        content: photoUrl
          ? [
              { type: 'text', text: 'Here is the plant photo. Apply your specialty.' },
              { type: 'image_url', image_url: { url: photoUrl } }
            ]
          : 'Here is the plant (no photo available). Apply your specialty using context only.'
      }
    ];
  }

  const scoped = history
    .filter(
      (m) =>
        m.role === 'user' ||
        (m.role === 'assistant' && m.agentKey === agent.key)
    )
    .slice(-PER_AGENT_HISTORY)
    .map<ChatMessage>((m) => ({ role: m.role, content: m.content }));

  // Attach the photo to the most recent user turn so vision context persists.
  const withImage: ChatMessage[] =
    photoUrl && scoped.length > 0
      ? scoped
      : scoped;

  return [
    sys,
    ...withImage,
    {
      role: 'user',
      content: photoUrl
        ? [
            { type: 'text', text: userContent },
            { type: 'image_url', image_url: { url: photoUrl } }
          ]
        : userContent
    }
  ];
}

async function runOne(
  agent: AgentDefinition,
  history: PriorMessage[],
  userContent: string,
  photoUrl: string | null | undefined,
  isInitial: boolean
): Promise<AgentReply> {
  const messages = buildAgentMessages(agent, history, userContent, photoUrl, isInitial);
  try {
    const reply = await chat(messages, {
      model: agent.model,
      temperature: 0.55,
      maxTokens: isInitial ? agent.initialMaxTokens : agent.followupMaxTokens
    });
    return { agentKey: agent.key, content: reply, ok: true };
  } catch (err) {
    console.error(`[agent:${agent.key}] failed`, err);
    return {
      agentKey: agent.key,
      content: `${agent.emoji} ${agent.name} is offline for a moment. Try again shortly.`,
      ok: false
    };
  }
}

/** Initial fan-out: run the chosen agents in parallel against the photo. */
export async function runInitialAnalysis(
  photoUrl: string | null | undefined,
  agentKeys?: AgentKey[]
): Promise<AgentReply[]> {
  const defs = agentKeys && agentKeys.length > 0
    ? agentKeys.map((k) => getAgent(k))
    : listAgents();
  const tasks = defs.map((a) => runOne(a, [], '', photoUrl, true));
  return Promise.all(tasks);
}

/** Followup: run only the agents the user @mentioned (or default care). */
export async function runFollowup(
  agentKeys: AgentKey[],
  history: PriorMessage[],
  userContent: string,
  photoUrl: string | null | undefined
): Promise<AgentReply[]> {
  const tasks = agentKeys.map((k) =>
    runOne(getAgent(k), history, userContent, photoUrl, false)
  );
  return Promise.all(tasks);
}
