'use client';

import { useObject } from '@ai-sdk/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import AiGeneratedBadge from '@/components/ai-generated-badge';
import EnumSelect, { type EnumSelectOption } from '@/components/enum-select';
import TranslationDisclaimer from '@/components/translation-disclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import UnsupportedLanguageDialog from '@/components/unsupported-language-dialog';
import { AUTH_ERROR, fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { type LanguageCode, languages, toLanguageName } from '@/lib/ai/languages';
import { translationSchema } from '@/lib/ai/schema';
import { type Tone, toneLabels, tones } from '@/lib/ai/tone';

const languageOptions: EnumSelectOption<LanguageCode>[] = languages.map(({ code, label }) => ({
  value: code,
  label,
}));

const toneOptions: EnumSelectOption<Tone>[] = tones.map((tone) => ({
  value: tone,
  label: toneLabels[tone],
}));

type TranslateError =
  | { kind: 'unsupported-language'; detectedSourceLanguage: string }
  | { kind: 'auth' }
  | { kind: 'generic' };

// useObject puts the raw response body into error.message, which is only JSON for the errors the
// route returns deliberately — anything else (an HTML error page, a network failure) lands here
// too. Classifying it in one place keeps that raw text out of the UI; the route logs the cause.
const parseTranslateError = (error: Error | undefined): TranslateError | null => {
  if (!error) return null;
  if (error.message.includes(AUTH_ERROR)) return { kind: 'auth' };

  try {
    const body = JSON.parse(error.message) as { detectedSourceLanguage?: unknown };
    if (typeof body.detectedSourceLanguage === 'string') {
      return { kind: 'unsupported-language', detectedSourceLanguage: body.detectedSourceLanguage };
    }
  } catch {
    // Body isn't JSON — nothing to extract, fall through to the generic case.
  }

  return { kind: 'generic' };
};

const Translate = () => {
  const [sourceText, setSourceText] = useState('');
  const [streamFailed, setStreamFailed] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');
  const [tone, setTone] = useState<Tone>('neutral');
  const { object, submit, isLoading, error, clear } = useObject({
    api: '/api/translate',
    schema: translationSchema,
    fetch: fetchWithAuthError,
    onFinish: ({ error }) => setStreamFailed(!!error),
  });

  const canSubmit = sourceText.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submit({ sourceText, targetLanguage, tone });
  };

  const translateError = parseTranslateError(error);
  const unsupportedLanguage =
    translateError?.kind === 'unsupported-language' ? translateError.detectedSourceLanguage : null;

  useEffect(() => {
    if (streamFailed && !isLoading) {
      toast.error('Die Übersetzung war unvollständig. Bitte versuche es erneut.');
    }
  }, [streamFailed, isLoading]);

  // Depends on `error` rather than the parsed result: parseTranslateError returns a new object on
  // every render, which would re-fire the toast on each one.
  useEffect(() => {
    const parsed = parseTranslateError(error);
    if (!parsed || parsed.kind === 'unsupported-language') return;

    if (parsed.kind === 'auth') {
      // Stays until dismissed: nothing works until the user acts on it, and an auto-dismissing
      // toast would take the login link with it.
      toast.error('Deine Sitzung ist abgelaufen.', {
        duration: Infinity,
        action: {
          label: 'Neu einloggen',
          onClick: () => {
            window.location.href = '/login';
          },
        },
      });
      return;
    }

    toast.error('Die Übersetzung ist fehlgeschlagen. Läuft Ollama?');
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="sourceText">Text zum Übersetzen einfügen</FieldLabel>
            <Textarea
              id="sourceText"
              value={sourceText}
              onChange={(e) => setSourceText(e.currentTarget.value)}
              placeholder="Zu übersetzender Text ..."
              disabled={isLoading}
              rows={8}
            />
          </Field>

          <div className="flex items-center gap-2">
            <EnumSelect
              id="targetLanguage"
              label="Sprache auswählen"
              value={targetLanguage}
              onValueChange={setTargetLanguage}
              options={languageOptions}
              disabled={isLoading}
              className="md:max-w-56 max-w-full"
            />

            <EnumSelect
              id="tone"
              label="Ton auswählen"
              value={tone}
              onValueChange={setTone}
              options={toneOptions}
              disabled={isLoading}
              className="md:max-w-56 max-w-full"
            />
            <Button onClick={handleSubmit} disabled={!canSubmit} className="self-end">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Übersetze…' : 'Übersetzen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <UnsupportedLanguageDialog
        open={unsupportedLanguage !== null}
        detectedLanguage={unsupportedLanguage ?? undefined}
        onOpenChange={(open) => {
          if (!open) clear();
        }}
      />

      {!unsupportedLanguage && (isLoading || object?.translatedText) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Übersetzung
              {isLoading && !object?.translatedText && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {object?.detectedSourceLanguage && (
                <span className="text-sm font-normal text-muted-foreground">
                  (erkannt: {toLanguageName(object.detectedSourceLanguage)})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm whitespace-pre-wrap">{object?.translatedText}</p>
            {object?.aiGenerated && (
              <>
                <AiGeneratedBadge />
                <TranslationDisclaimer />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Translate;
