import { z } from 'zod';

export const ResearchQueryDto = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.coerce.number().int().optional(),
  keyword: z.coerce.number().int().optional(),
  author: z.coerce.number().int().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['date', 'title', 'downloads', 'citations', 'views']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ResearchQueryDtoType = z.infer<typeof ResearchQueryDto>;
