'use client';

import { useObject } from '@ai-sdk/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import AiGeneratedBadge from '@/components/ai-generated-badge';
import EnumSelect, { type EnumSelectOption } from '@/components/enum-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
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

const parseUnsupportedLanguage = (error: Error | undefined): string | null => {
  if (!error) return null;
  try {
    const body = JSON.parse(error.message) as { detectedSourceLanguage?: unknown };
    return typeof body.detectedSourceLanguage === 'string' ? body.detectedSourceLanguage : null;
  } catch {
    return null;
  }
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

  const unsupportedLanguage = parseUnsupportedLanguage(error);

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

      {streamFailed && !isLoading && (
        <FieldError className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Die Übersetzung ist fehlgeschlagen. Läuft Ollama?
        </FieldError>
      )}

      {error &&
        !unsupportedLanguage &&
        (error.message.includes(AUTH_ERROR) ? (
          <FieldError className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Deine Sitzung ist abgelaufen.{' '}
            <a href="/login" className="font-medium underline">
              Bitte neu einloggen
            </a>
            .
          </FieldError>
        ) : (
          <FieldError className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Etwas ist schiefgelaufen. Läuft Ollama? ({error.message})
          </FieldError>
        ))}

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
            {object?.aiGenerated && <AiGeneratedBadge />}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Translate;
