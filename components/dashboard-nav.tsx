'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Übersetzen' },
  { href: '/dashboard/history', label: 'Verlauf' },
] as const;

const DashboardNav = () => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {links.map(({ href, label }) => {
        // Exact match rather than startsWith: /dashboard is a prefix of every other route here
        // and would otherwise stay highlighted on all of them.
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'transition-colors hover:text-foreground',
              isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
};

export default DashboardNav;
