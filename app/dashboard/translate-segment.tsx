'use client';

import { useObject } from '@ai-sdk/react';
import { MessageSquarePlus, Square } from 'lucide-react';
import { memo, useId, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { type LanguageCode } from '@/lib/ai/languages';
import { translationOutputSchema } from '@/lib/ai/schema';
import { type Tone } from '@/lib/ai/tone';
import { cn } from '@/lib/utils';

type TranslationSegmentProps = {
  segmentIndex: number;
  sourceSegment: string;
  translatedSegment: string;
  sourceLanguage: LanguageCode | null;
  targetLanguage: LanguageCode;
  tone: Tone;
  translationId: string | null;
  onRetranslated: (index: number, translatedText: string) => void;
};

const TranslationSegment = ({
  segmentIndex,
  sourceSegment,
  translatedSegment,
  sourceLanguage,
  targetLanguage,
  tone,
  translationId,
  onRetranslated,
}: TranslationSegmentProps) => {
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  // Every rendered segment needs its own field id for the label to point at. Derived from React
  // rather than from the paragraph's text or index: the text makes an unusable id, and an index is
  // only unique within the list that produced it.
  const commentFieldId = useId();

  const { object, submit, isLoading, stop } = useObject({
    api: '/api/retranslate',
    schema: translationOutputSchema,
    fetch: fetchWithAuthError,
    // Everything that happens once a retranslation completes lives here rather than in an effect:
    // the callback fires exactly once per stream, so there is no render-identity dependency that
    // could re-trigger it (an inline onRetranslated prop plus an effect is an update loop).
    onFinish: ({ object: retranslation, error }) => {
      // An empty revision would blank the paragraph on screen — the route declines to store one
      // for the same reason, so display and history stay in step.
      if (error || !retranslation?.translatedText?.trim()) {
        toast.error('Die Neuübersetzung war unvollständig. Bitte versuche es erneut.');
        return;
      }
      onRetranslated(segmentIndex, retranslation.translatedText);
      setIsCommenting(false);
      setComment('');
    },
    onError: () => toast.error('Die Neuübersetzung ist fehlgeschlagen. Läuft Ollama?'),
  });

  const handleSubmit = () => {
    if (isLoading) return;
    // currentTranslation is what the user is commenting on, so it is what gets revised.
    // sourceSegment is matched to this paragraph by position and can be the wrong one when the
    // model merges or splits paragraphs, so it travels as context only, never as the subject.
    //
    // translationId and segmentIndex are what the route needs to store the result itself: the
    // client reports which paragraph it revised, not what the saved document should become.
    submit({
      currentTranslation: translatedSegment,
      segmentText: sourceSegment,
      sourceLanguage,
      comment,
      targetLanguage,
      tone,
      translationId,
      segmentIndex,
    });
  };

  return (
    <>
      {isCommenting && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsCommenting(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'group relative -mx-3 rounded-md px-3 py-2 transition-colors',
          isCommenting ? 'z-50 bg-card' : 'hover:bg-muted/50'
        )}
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 whitespace-pre-wrap">
            {isLoading ? (object?.translatedText ?? translatedSegment) : translatedSegment}
          </p>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsCommenting((prev) => !prev)}
            aria-label={isCommenting ? 'Kommentar schließen' : 'Kommentar hinzufügen'}
            aria-expanded={isCommenting}
            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        {isCommenting && (
          <div className="mt-2 flex flex-col gap-2 rounded-md border p-3">
            <Field>
              <FieldLabel htmlFor={commentFieldId} className="sr-only">
                Kommentar zu diesem Absatz
              </FieldLabel>
              <Textarea
                id={commentFieldId}
                value={comment}
                onChange={(e) => setComment(e.currentTarget.value)}
                placeholder="z. B. Fachbegriff X statt Y verwenden ..."
                disabled={isLoading}
                className="min-h-16 resize-none text-sm"
              />
            </Field>
            {/* No spinner next to the button while streaming — the paragraph above is visibly
              growing, which is the better progress signal, and it leaves the primary slot free
              for the escape hatch a stuck generation needs. */}
            <div className="flex justify-end gap-2">
              {isLoading ? (
                <Button type="button" variant="destructive" size="sm" onClick={stop}>
                  <Square className="h-4 w-4" />
                  Stoppen
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCommenting(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button type="button" size="sm" onClick={handleSubmit}>
                    Neu übersetzen
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Memoised because every keystroke in the source field re-renders the provider and with it the
// whole segment list. All props are stable across those renders (the callback is a useCallback in
// the provider), so an untouched paragraph — including one mid-stream — bails out here.
export default memo(TranslationSegment);
