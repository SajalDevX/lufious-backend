export type AgentKey = 'soil' | 'disease' | 'solar' | 'care';

export const ALL_AGENT_KEYS: readonly AgentKey[] = [
  'soil',
  'disease',
  'solar',
  'care'
] as const;

export interface AgentDefinition {
  key: AgentKey;
  name: string;
  emoji: string;
  aliases: string[];
  model: string;
  systemPrompt: string;
  initialInstructions: string;
  followupInstructions: string;
  initialMaxTokens: number;
  followupMaxTokens: number;
}
