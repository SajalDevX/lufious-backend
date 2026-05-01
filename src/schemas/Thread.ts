import { z } from 'zod';

export const ThreadDoc = z.object({
  _id: z.string(),
  participants: z.array(z.string()).length(2),
  listingId: z.string().optional().nullable(),
  lastMessage: z.string().default(''),
  lastMessageAt: z.number().default(0),
  lastSenderId: z.string().optional().nullable(),
  unread: z.record(z.string(), z.number()).default({}),
  createdAt: z.number()
});
export type ThreadDoc = z.infer<typeof ThreadDoc>;

export const ThreadCreate = z.object({
  recipientId: z.string().min(1),
  listingId: z.string().optional()
});
export type ThreadCreate = z.infer<typeof ThreadCreate>;

export const MessageDoc = z.object({
  _id: z.string(),
  threadId: z.string(),
  senderId: z.string(),
  body: z.string().min(1).max(2000),
  createdAt: z.number()
});
export type MessageDoc = z.infer<typeof MessageDoc>;

export const MessageCreate = z.object({
  body: z.string().min(1).max(2000)
});
export type MessageCreate = z.infer<typeof MessageCreate>;
