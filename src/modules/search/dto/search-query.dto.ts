import { z } from 'zod';

export const SearchQueryDto = z.object({
  q: z.string().min(1),
  category: z.coerce.number().int().optional(),
  author: z.coerce.number().int().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchQueryDtoType = z.infer<typeof SearchQueryDto>;
