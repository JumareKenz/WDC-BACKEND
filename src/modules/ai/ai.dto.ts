import { z } from 'zod';

export const AskAiDto = z.object({
  question: z.string().min(1).max(2000),
});

export type AskAiDto = z.infer<typeof AskAiDto>;

export const AiResponseDto = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      type: z.enum(['structured', 'semantic']),
      queryId: z.string().optional(),
      embeddingId: z.string().optional(),
      snippet: z.string(),
    }),
  ),
  cached: z.boolean().optional(),
});

export type AiResponseDto = z.infer<typeof AiResponseDto>;

export const AiErrorDto = z.object({
  message: z.string(),
  error: z.string(),
  statusCode: z.number(),
});

export type AiErrorDto = z.infer<typeof AiErrorDto>;

export const AiQueryParams = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

export type AiQueryParams = z.infer<typeof AiQueryParams>;