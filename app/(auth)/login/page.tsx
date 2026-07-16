'use client';

import { useActionState } from 'react';

import { loginAction, signupAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const [loginState, loginFormAction, isLoginPending] = useActionState(loginAction, null);
  const [signupState, signupFormAction, isSignupPending] = useActionState(signupAction, null);

  return (
    <Tabs defaultValue="login">
      <TabsList className="w-full">
        <TabsTrigger value="login" className="flex-1">
          Einloggen
        </TabsTrigger>
        <TabsTrigger value="register" className="flex-1">
          Registrieren
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login">
        <form action={loginFormAction} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">E-Mail</Label>
            <Input id="login-email" name="email" type="email" required />
            {loginState?.fieldErrors?.email?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-password">Passwort</Label>
            <Input id="login-password" name="password" type="password" required minLength={8} />
          </div>

          {loginState?.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {loginState.error}
            </div>
          )}

          <Button type="submit" disabled={isLoginPending} className="w-full">
            {isLoginPending ? 'Wird angemeldet...' : 'Einloggen'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="register">
        <form action={signupFormAction} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-email">E-Mail</Label>
            <Input id="register-email" name="email" type="email" required />
            {signupState?.fieldErrors?.email?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="register-password">Passwort</Label>
            <Input id="register-password" name="password" type="password" required minLength={8} />
            {signupState?.fieldErrors?.password?.map((err) => (
              <p key={err} className="text-sm text-destructive">
                {err}
              </p>
            ))}
          </div>

          {signupState?.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {signupState.error}
            </div>
          )}

          {signupState?.success && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
              {signupState.success}
            </div>
          )}

          <Button type="submit" disabled={isSignupPending} className="w-full">
            {isSignupPending ? 'Wird registriert...' : 'Registrieren'}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
