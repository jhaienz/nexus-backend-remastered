import { z } from 'zod';

export const ForgotPasswordDto = z.object({
  email: z.string().email(),
});

export type ForgotPasswordDtoType = z.infer<typeof ForgotPasswordDto>;
