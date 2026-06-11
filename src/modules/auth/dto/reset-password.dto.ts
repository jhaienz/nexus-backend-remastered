import { z } from 'zod';

export const ResetPasswordDto = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type ResetPasswordDtoType = z.infer<typeof ResetPasswordDto>;
