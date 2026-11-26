import { z } from 'zod';

export const searchTalentPoolSchema = z.object({
  domain: z.string().optional(),
  query: z.string().optional(),
  minScore: z.coerce.number().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  // z.coerce.boolean would turn the string "false" into true.
  shortlisted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type SearchTalentPoolInput = z.infer<typeof searchTalentPoolSchema>;

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
