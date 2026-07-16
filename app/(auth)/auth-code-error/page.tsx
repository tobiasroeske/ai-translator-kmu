import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function AuthCodeErrorPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-medium text-destructive">
        Der Bestätigungslink ist ungültig oder abgelaufen.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Zurück zum Login</Link>
      </Button>
    </div>
  );
}
