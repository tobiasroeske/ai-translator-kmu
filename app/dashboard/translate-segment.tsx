'use client';

import { useObject } from '@ai-sdk/react';
import { MessageSquarePlus, Square } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { type LanguageCode } from '@/lib/ai/languages';
import { retranslateSchema } from '@/lib/ai/schema';
import { type Tone } from '@/lib/ai/tone';

type TranslationSegmentProps = {
  sourceSegment: string;
  translatedSegment: string;
  targetLanguage: LanguageCode;
  tone: Tone;
  onRetranslated: (translatedText: string) => void;
};

const TranslationSegment = ({
  sourceSegment,
  translatedSegment,
  targetLanguage,
  tone,
  onRetranslated,
}: TranslationSegmentProps) => {
  const [comment, setComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  const { object, submit, isLoading, stop } = useObject({
    api: '/api/retranslate',
    schema: retranslateSchema,
    fetch: fetchWithAuthError,
    // Everything that happens once a retranslation completes lives here rather than in an effect:
    // the callback fires exactly once per stream, so there is no render-identity dependency that
    // could re-trigger it (an inline onRetranslated prop plus an effect is an update loop).
    onFinish: ({ object: retranslation, error }) => {
      if (error || !retranslation) {
        toast.error('Die Neuübersetzung war unvollständig. Bitte versuche es erneut.');
        return;
      }
      onRetranslated(retranslation.translatedText);
      setIsCommenting(false);
      setComment('');
    },
    onError: () => toast.error('Die Neuübersetzung ist fehlgeschlagen. Läuft Ollama?'),
  });

  const handleSubmit = () => {
    if (isLoading) return;
    submit({ segmentText: sourceSegment, comment, targetLanguage, tone });
  };

  return (
    <div className="group relative">
      {/* Live-streamed while a retranslation is in flight, so the same "grow in place" UX as the
          main translation applies here too — otherwise this segment would look frozen while
          every other segment already reflects the finished result. */}
      <p className="whitespace-pre-wrap">
        {isLoading ? (object?.translatedText ?? translatedSegment) : translatedSegment}
      </p>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsCommenting((prev) => !prev)}
        aria-label={isCommenting ? 'Kommentar schließen' : 'Kommentar hinzufügen'}
        aria-expanded={isCommenting}
        className="absolute -top-2 -right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <MessageSquarePlus className="h-4 w-4" />
      </Button>

      {isCommenting && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border p-3">
          <Field>
            <FieldLabel htmlFor={`comment-${sourceSegment}`} className="sr-only">
              Kommentar zu diesem Absatz
            </FieldLabel>
            <Textarea
              id={`comment-${sourceSegment}`}
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
  );
};

export default TranslationSegment;
