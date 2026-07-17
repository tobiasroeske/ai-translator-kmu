import { z } from 'zod';

export const confirmSignupSchema = z.object({
  token_hash: z.string().min(1),
  type: z.enum(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']),
});
