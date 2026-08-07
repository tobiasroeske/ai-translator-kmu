import '@/app/globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'KI Translator KMU',
  description: 'AI-powered business text translator for SMEs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', inter.variable)}>
      <body>
        {children}
        {/* richColors gives error toasts a red variant instead of the neutral popover styling.
            6s over the 4s default: these carry a recovery hint ("Läuft Ollama?") that takes
            longer to read and act on than a confirmation would. */}
        <Toaster richColors closeButton duration={6000} />
      </body>
    </html>
  );
}
