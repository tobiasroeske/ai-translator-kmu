'use client';

import { Loader2, Square } from 'lucide-react';

import TranslationSegment from '@/app/dashboard/translate-segment';
import AiGeneratedBadge from '@/components/ai-generated-badge';
import EnumSelect, { type EnumSelectOption } from '@/components/enum-select';
import { useTranslate } from '@/components/translate-provider';
import TranslationDisclaimer from '@/components/translation-disclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import UnsupportedLanguageDialog from '@/components/unsupported-language-dialog';
import { type LanguageCode, languages, toLanguageName } from '@/lib/ai/languages';
import { MAX_SOURCE_TEXT_LENGTH } from '@/lib/ai/limits';
import { type Tone, toneLabels, tones } from '@/lib/ai/tone';
import { cn } from '@/lib/utils';

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
    isTooLong,
    handleSubmit,
    unsupportedLanguage,
    stop,
    segments,
    sourceSegments,
    retranslateSegment,
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
              {/* Deliberately no maxLength: the browser would silently truncate a pasted text that
                  is too long. Showing the overrun and blocking submit lets the user shorten it
                  themselves instead of translating something they didn't notice was cut. */}
              <Textarea
                id="sourceText"
                value={sourceText}
                onChange={(e) => setSourceText(e.currentTarget.value)}
                placeholder="Zu übersetzender Text ..."
                disabled={isLoading}
                aria-describedby="sourceTextCount"
                aria-invalid={isTooLong}
                className="min-h-64 flex-1 resize-none"
              />
              <FieldDescription
                id="sourceTextCount"
                className={cn('text-right tabular-nums', isTooLong && 'text-destructive')}
              >
                {sourceText.length.toLocaleString('de-DE')} /{' '}
                {MAX_SOURCE_TEXT_LENGTH.toLocaleString('de-DE')} Zeichen
                {isTooLong && ' — bitte kürzen'}
              </FieldDescription>
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
            {/* Gated on !isLoading, not just segments.length > 0: while a new translation is
                streaming, `segments` still holds the previous, finished translation until the
                provider's onFinish replaces it — without this guard the stale paragraphs would
                flash in front of the incoming stream instead of the live blob text below. */}
            {!isLoading && segments.length > 0 ? (
              <div className="min-h-64 flex-1 space-y-3 text-sm">
                {/* Index as key is safe here: the list is only ever (re)built wholesale when a new
                    translation finishes — it never reorders/inserts/removes entries out from under
                    React between renders, only replaces individual strings in place. */}
                {/* eslint-disable react/no-array-index-key */}
                {segments.map((segment, index) => (
                  <TranslationSegment
                    key={index}
                    sourceSegment={sourceSegments[index] ?? ''}
                    translatedSegment={segment}
                    targetLanguage={targetLanguage}
                    tone={tone}
                    onRetranslated={(translatedText) => retranslateSegment(index, translatedText)}
                  />
                ))}
                {/* eslint-enable react/no-array-index-key */}
              </div>
            ) : object?.translatedText ? (
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

        {/* The spinner in the card title covers "started but nothing back yet"; once text is
            streaming it is its own progress indicator. So this slot shows the way out of a
            generation that won't end rather than a second spinner. */}
        {isLoading ? (
          <Button variant="destructive" onClick={stop} className="ml-auto">
            <Square className="h-4 w-4" />
            Stoppen
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="ml-auto">
            Übersetzen
          </Button>
        )}
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
