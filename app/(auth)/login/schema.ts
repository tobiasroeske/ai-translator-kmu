import z from 'zod';

export const authSchema = z.object({
  email: z.string().email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z
    .string()
    .min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein.')
    .regex(/[A-Z]/, 'Das Passwort muss mindestens einen Großbuchstaben enthalten.')
    .regex(/\d/, 'Das Passwort muss mindestens eine Zahl enthalten.'),
});

export const signupSchema = authSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Die Passwörter stimmen nicht überein.',
    path: ['confirmPassword'],
  });
