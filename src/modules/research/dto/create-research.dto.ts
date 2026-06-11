import { z } from 'zod';

export const CreateResearchDto = z.object({
  title: z.string().min(1).max(500),
  abstract: z.string().optional(),
  authors: z.array(z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
  })).min(1),
  categories: z.array(z.string().max(255)).optional(),
  keywords: z.array(z.string().max(255)).optional(),
  filePrivacy: z.enum(['public', 'private']).default('public'),
});

export type CreateResearchDtoType = z.infer<typeof CreateResearchDto>;
