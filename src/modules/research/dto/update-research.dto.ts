import { z } from 'zod';

export const UpdateResearchDto = z.object({
  title: z.string().min(1).max(500).optional(),
  abstract: z.string().optional(),
  authors: z.array(z.object({
    name: z.string().min(1).max(255),
    email: z.string().email().optional(),
  })).optional(),
  categories: z.array(z.string().max(255)).optional(),
  keywords: z.array(z.string().max(255)).optional(),
});

export type UpdateResearchDtoType = z.infer<typeof UpdateResearchDto>;
