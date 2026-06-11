import { z } from 'zod';

export const RegisterDto = z.object({
  firstName: z.string().min(1).max(255),
  middleName: z.string().max(255).optional(),
  lastName: z.string().min(1).max(255),
  suffix: z.string().max(50).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  roleId: z.number().int().default(2),
  programId: z.number().int().optional(),
  institutionId: z.number().int().optional(),
});

export type RegisterDtoType = z.infer<typeof RegisterDto>;
