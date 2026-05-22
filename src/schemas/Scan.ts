import { z } from 'zod';

export const AgentKeyEnum = z.enum(['soil', 'disease', 'solar', 'care']);
export type AgentKeyT = z.infer<typeof AgentKeyEnum>;

export const ScanMessage = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string().min(1).max(4000),
  // Present on assistant messages routed through a specific agent.
  agentKey: AgentKeyEnum.optional(),
  // On user messages: which agents were addressed via @mention (or default).
  mentions: z.array(AgentKeyEnum).optional(),
  createdAt: z.number()
});
export type ScanMessage = z.infer<typeof ScanMessage>;

export const ScanDoc = z.object({
  _id: z.string(),
  userId: z.string(),
  speciesName: z.string().default(''),
  commonName: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0),
  healthStatus: z.enum(['healthy', 'warning', 'critical']).default('healthy'),
  diagnosis: z.string().default(''),
  carePlan: z.string().default(''),
  photoUrl: z.string().url().optional().nullable(),
  messages: z.array(ScanMessage).default([]),
  aiSummary: z.string().optional(),
  // Tracks which agents have produced an initial analysis (so client knows progress).
  agentsReady: z.array(AgentKeyEnum).default([]),
  timestamp: z.number()
});
export type ScanDoc = z.infer<typeof ScanDoc>;

export const ScanCreate = z.object({
  photoUrl: z.string().url(),
  // Optional filter: only run these agents on the initial fan-out. Omit/empty = all four.
  agents: z.array(AgentKeyEnum).min(1).max(4).optional()
});
export type ScanCreate = z.infer<typeof ScanCreate>;

export const ScanMessageCreate = z.object({
  content: z.string().min(1).max(4000)
});
export type ScanMessageCreate = z.infer<typeof ScanMessageCreate>;
