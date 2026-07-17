import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Login | KI Translator KMU',
  description: 'Login zur KI Translator KMU Anwendung',
};

const LoginLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
          <header className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              KI Translator KMU
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">Einloggen</h1>
            <p className="mt-2 text-sm text-slate-500">Bitte melde dich mit deinem Konto an.</p>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
};

export default LoginLayout;
