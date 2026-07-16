'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { authSchema } from '@/app/(auth)/login/schema';
import { createClient } from '@/lib/supabase/server';

export type AuthState = {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
  success?: string;
} | null;

export const loginAction = async (
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState | never> => {
  const rawData = Object.fromEntries(formData.entries());
  const validatedData = authSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: 'Bitte überprüfe deine Eingabe',
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedData.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
};

export const signupAction = async (
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> => {
  const rawData = Object.fromEntries(formData.entries());
  const validatedData = authSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: 'Bitte überprüfe deine Eingabe',
      fieldErrors: validatedData.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedData.data;
  const supabase = await createClient();

  const headersList = await headers();
  const origin = headersList.get('origin') ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // data.session ist nur gesetzt wenn "Enable email confirmations" in Supabase deaktiviert ist.
  // In dem Fall ist der User sofort eingeloggt → direkt zu Dashboard.
  // Mit aktivierter Bestätigung ist session null → User muss erst die E-Mail bestätigen.
  if (data.session) {
    revalidatePath('/', 'layout');
    redirect('/dashboard');
  }

  return {
    success: 'Registrierung erfolgreich! Bitte überprüfe deine E-Mails und bestätige dein Konto.',
  };
};

export const logout = async () => {
  const supabase = await createClient();

  await supabase.auth.signOut({ scope: 'local' });

  revalidatePath('/', 'layout');
  redirect('/login');
};
