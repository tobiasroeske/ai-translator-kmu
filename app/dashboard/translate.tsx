'use client';

import { useObject } from '@ai-sdk/react';
import { useState } from 'react';

import AiGeneratedBadge from '@/components/ai-generated-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AUTH_ERROR, fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { translationSchema } from '@/lib/ai/schema';

const Translate = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const { object, submit, isLoading, error } = useObject({
    api: '/api/translate',
    schema: translationSchema,
    fetch: fetchWithAuthError,
  });

  const canSubmit = sourceText.trim().length > 0 && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submit({ sourceText, targetLanguage });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Text übersetzen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.currentTarget.value)}
            placeholder="Text zum Übersetzen einfügen…"
            disabled={isLoading}
            rows={8}
          />

          <div className="flex items-center gap-2">
            <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">Englisch</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isLoading ? 'Übersetze…' : 'Übersetzen'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error &&
        (error.message.includes(AUTH_ERROR) ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Deine Sitzung ist abgelaufen.{' '}
            <a href="/login" className="font-medium underline">
              Bitte neu einloggen
            </a>
            .
          </div>
        ) : (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Etwas ist schiefgelaufen. Läuft Ollama? ({error.message})
          </div>
        ))}

      {(isLoading || object?.translatedText) && (
        <Card>
          <CardHeader>
            <CardTitle>
              Übersetzung
              {object?.detectedSourceLanguage && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (erkannt: {object.detectedSourceLanguage})
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
