import AiGeneratedBadge from '@/components/ai-generated-badge';
import TranslationDisclaimer from '@/components/translation-disclaimer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toLanguageName } from '@/lib/ai/languages';
import { isSupportedTone, toneLabels } from '@/lib/ai/tone';
import { createClient } from '@/lib/supabase/server';

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const HistoryPage = async () => {
  const supabase = await createClient();

  // No user_id filter — the select policy scopes this to the session's own rows. Filtering here
  // too would only duplicate the guarantee in a place that can silently drift from it.
  const { data: translations, error } = await supabase
    .from('translations')
    .select('*')
    .order('created_at', { ascending: false });

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
          {/* Once for the whole list rather than per entry: FA-10 qualifies the translations shown
              on this page, and repeating it under every card would bury it in noise. The FA-05
              label stays per entry — that one has to sit on the output itself. */}
          <TranslationDisclaimer />

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
                <AiGeneratedBadge />
                <details className="text-sm text-muted-foreground">
                  <summary className="w-fit cursor-pointer select-none hover:text-foreground">
                    Originaltext anzeigen
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{translation.source_text}</p>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
