import Link from 'next/link';
import { type ReactNode } from 'react';

import DashboardNav from '@/components/dashboard-nav';
import LogoutButton from '@/components/logoutButton';
import { TranslateProvider } from '@/components/translate-provider';

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                KI
              </span>
              <span className="text-sm font-semibold">KI Translator KMU</span>
            </Link>
            <DashboardNav />
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <TranslateProvider>{children}</TranslateProvider>
      </main>
    </div>
  );
};

export default DashboardLayout;
