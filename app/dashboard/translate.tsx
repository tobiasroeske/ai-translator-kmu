'use client';

import { Loader2 } from 'lucide-react';

import AiGeneratedBadge from '@/components/ai-generated-badge';
import EnumSelect, { type EnumSelectOption } from '@/components/enum-select';
import { useTranslate } from '@/components/translate-provider';
import TranslationDisclaimer from '@/components/translation-disclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import UnsupportedLanguageDialog from '@/components/unsupported-language-dialog';
import { type LanguageCode, languages, toLanguageName } from '@/lib/ai/languages';
import { type Tone, toneLabels, tones } from '@/lib/ai/tone';

const languageOptions: EnumSelectOption<LanguageCode>[] = languages.map(({ code, label }) => ({
  value: code,
  label,
}));

const toneOptions: EnumSelectOption<Tone>[] = tones.map((tone) => ({
  value: tone,
  label: toneLabels[tone],
}));

const Translate = () => {
  const {
    sourceText,
    setSourceText,
    targetLanguage,
    setTargetLanguage,
    tone,
    setTone,
    object,
    isLoading,
    canSubmit,
    handleSubmit,
    unsupportedLanguage,
    clear,
  } = useTranslate();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">Quelltext</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Field className="h-full">
              <FieldLabel htmlFor="sourceText" className="sr-only">
                Text zum Übersetzen einfügen
              </FieldLabel>
              <Textarea
                id="sourceText"
                value={sourceText}
                onChange={(e) => setSourceText(e.currentTarget.value)}
                placeholder="Zu übersetzender Text ..."
                disabled={isLoading}
                className="min-h-64 flex-1 resize-none"
              />
            </Field>
          </CardContent>
        </Card>

        {/* Rendered unconditionally so the two columns keep the same shape before, during and
            after a translation — a card that appears on submit would shift the layout mid-stream. */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
          <CardContent className="flex flex-1 flex-col gap-3">
            {object?.translatedText ? (
              <p className="min-h-64 flex-1 text-sm whitespace-pre-wrap">{object.translatedText}</p>
            ) : (
              <p className="min-h-64 flex-1 text-sm text-muted-foreground">
                Die Übersetzung erscheint hier.
              </p>
            )}
            {object?.aiGenerated && (
              <>
                <AiGeneratedBadge />
                <TranslationDisclaimer />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <EnumSelect
          id="targetLanguage"
          label="Sprache auswählen"
          value={targetLanguage}
          onValueChange={setTargetLanguage}
          options={languageOptions}
          disabled={isLoading}
          className="max-w-full md:max-w-56"
        />

        <EnumSelect
          id="tone"
          label="Ton auswählen"
          value={tone}
          onValueChange={setTone}
          options={toneOptions}
          disabled={isLoading}
          className="max-w-full md:max-w-56"
        />

        <Button onClick={handleSubmit} disabled={!canSubmit} className="ml-auto">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Übersetze…' : 'Übersetzen'}
        </Button>
      </div>

      <UnsupportedLanguageDialog
        open={unsupportedLanguage !== null}
        detectedLanguage={unsupportedLanguage ?? undefined}
        onOpenChange={(open) => {
          if (!open) clear();
        }}
      />
    </div>
  );
};

export default Translate;
