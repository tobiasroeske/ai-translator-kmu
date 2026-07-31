'use client';

import { useObject } from '@ai-sdk/react';
import { useState } from 'react';

import AiGeneratedBadge from '@/components/ai-generated-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import UnsupportedLanguageDialog from '@/components/unsupported-language-dialog';
import { AUTH_ERROR, fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { languages, toLanguageName } from '@/lib/ai/languages';
import { translationSchema } from '@/lib/ai/schema';

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
  const [targetLanguage, setTargetLanguage] = useState('en');
  const { object, submit, isLoading, error, clear } = useObject({
    api: '/api/translate',
    schema: translationSchema,
    fetch: fetchWithAuthError,
    onFinish: ({ error }) => setStreamFailed(!!error),
  });

  const canSubmit = sourceText.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submit({ sourceText, targetLanguage });
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
            <Field className="md:max-w-56 max-w-full">
              <FieldLabel htmlFor="targetLanguage">Sprache auswählen</FieldLabel>
              <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isLoading}>
                <SelectTrigger id="targetLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="self-end">
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
            <CardTitle>
              Übersetzung
              {object?.detectedSourceLanguage && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
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
