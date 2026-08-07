import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

type PaginationProps = {
  page: number;
  totalPages: number;
  /** Base path to link to, e.g. "/dashboard/history" — page numbers are appended as ?page=n. */
  basePath: string;
};

// Plain <Link>s rather than a client-side "Load more" — page navigation this way works without
// JS, is bookmarkable/shareable, and plays along with the browser's back/forward buttons for
// free. No page-number buttons: for a history list, "back"/"forward" is all users need.
const Pagination = ({ page, totalPages, basePath }: PaginationProps) => {
  if (totalPages <= 1) return null;

  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Verlaufsseiten"
      className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground"
    >
      <Button variant="outline" size="sm" disabled={!hasPrevious} asChild={hasPrevious}>
        {hasPrevious ? (
          <Link href={`${basePath}?page=${page - 1}`}>
            <ChevronLeft />
            Zurück
          </Link>
        ) : (
          <>
            <ChevronLeft />
            Zurück
          </>
        )}
      </Button>

      <span>
        Seite {page} von {totalPages}
      </span>

      <Button variant="outline" size="sm" disabled={!hasNext} asChild={hasNext}>
        {hasNext ? (
          <Link href={`${basePath}?page=${page + 1}`}>
            Weiter
            <ChevronRight />
          </Link>
        ) : (
          <>
            Weiter
            <ChevronRight />
          </>
        )}
      </Button>
    </nav>
  );
};

export default Pagination;
