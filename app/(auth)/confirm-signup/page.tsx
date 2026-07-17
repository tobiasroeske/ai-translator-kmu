import { redirect } from 'next/navigation';

import { confirmSignupAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';

type ConfirmSignupPageProps = {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
};

const ConfirmSignupPage = async ({ searchParams }: ConfirmSignupPageProps) => {
  const { token_hash: tokenHash, type } = await searchParams;

  if (!tokenHash || !type) {
    redirect('/auth-code-error');
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold tracking-tight">E-Mail bestätigen</h1>
      <p className="text-sm text-muted-foreground">
        Klicke auf den Button, um deine Registrierung abzuschließen.
      </p>
      {/* Bewusst ein manueller Klick (POST) statt eines automatischen GET-Redirects:
          Apple Mail Privacy Protection ruft Links in Mails automatisch im Hintergrund
          auf, was den einmal gültigen token_hash sonst schon vor dem echten Klick
          verbraucht. */}
      <form action={confirmSignupAction}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <Button type="submit" className="w-full">
          E-Mail bestätigen
        </Button>
      </form>
    </div>
  );
};

export default ConfirmSignupPage;
