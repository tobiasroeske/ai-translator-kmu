import { redirect } from 'next/navigation';

import CopyToClipboardButton from '@/components/copy-to-clipboard-button';
import Pagination from '@/components/pagination';
import TranslationNotice from '@/components/translation-notice';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toLanguageName } from '@/lib/ai/languages';
import { isSupportedTone, toneLabels } from '@/lib/ai/tone';
import { createClient } from '@/lib/supabase/server';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type HistoryPageProps = {
  searchParams: Promise<{ page?: string }>;
};

const HistoryPage = async ({ searchParams }: HistoryPageProps) => {
  const rawPage = Number((await searchParams).page);
  const requestedPage = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 5;

  const supabase = await createClient();

  // Count first (head: true — no rows, just the count) and clamp the page before ever building
  // a range. A page past the available data (?page=99 with only 3 pages worth of rows) would
  // otherwise make .range() ask PostgREST for an out-of-bounds slice, which answers with 416
  // Range Not Satisfiable — supabase-js surfaces that as a near-empty {} error, not something
  // worth showing the user as "load failed". Clamping turns an invalid URL into a valid one
  // instead of treating it as a data-loading problem.
  const { count } = await supabase.from('translations').select('*', { count: 'exact', head: true });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));
  const page = Math.min(requestedPage, totalPages);

  if (page !== requestedPage) {
    redirect(`/dashboard/history?page=${page}`);
  }

  // No user_id filter — the select policy scopes this to the session's own rows. Filtering here
  // too would only duplicate the guarantee in a place that can silently drift from it.
  const { data: translations, error } = await supabase
    .from('translations')
    .select('*')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error('Failed to load translation history:', error);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Verlauf</h1>
        <p className="text-sm text-muted-foreground">
          Deine bisherigen Übersetzungen, neueste zuerst.
        </p>
      </div>

      {error ? (
        <Card>
          <CardContent className="text-sm text-destructive">
            Der Verlauf konnte nicht geladen werden. Bitte lade die Seite neu.
          </CardContent>
        </Card>
      ) : !translations?.length ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Noch keine Übersetzungen vorhanden. Sobald du eine Übersetzung erstellst, erscheint sie
            hier.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {translations.map((translation) => (
            <Card key={translation.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
                  {toLanguageName(translation.source_language)} →{' '}
                  {toLanguageName(translation.target_language)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {dateFormatter.format(new Date(translation.created_at))}
                    {isSupportedTone(translation.tone) && ` · ${toneLabels[translation.tone]}`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm whitespace-pre-wrap">{translation.translated_text}</p>
                {/* Per entry, not once for the page: the notice qualifies a specific translation,
                    and each card can be read (or copied out of) on its own. */}
                <TranslationNotice />
                <details className="text-sm text-muted-foreground">
                  <summary className="w-fit cursor-pointer select-none hover:text-foreground">
                    Originaltext anzeigen
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{translation.source_text}</p>
                </details>
              </CardContent>
              <CardFooter className="flex justify-end">
                <CopyToClipboardButton text={translation.translated_text} />
              </CardFooter>
            </Card>
          ))}

          <Pagination page={page} totalPages={totalPages} basePath="/dashboard/history" />
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
