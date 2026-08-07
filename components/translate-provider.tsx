'use client';

import { useObject } from '@ai-sdk/react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { toast } from 'sonner';

import { AUTH_ERROR, fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { type LanguageCode } from '@/lib/ai/languages';
import { MAX_SOURCE_TEXT_LENGTH } from '@/lib/ai/limits';
import { translationSchema } from '@/lib/ai/schema';
import { segmentText } from '@/lib/ai/segment';
import { type Tone } from '@/lib/ai/tone';

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

// Everything useObject holds (object, isLoading, the running fetch) plus the form fields. Lives
// above the routed pages (see app/dashboard/layout.tsx) instead of inside translate.tsx, so
// navigating to /dashboard/history and back doesn't unmount it — a translation in progress keeps
// streaming, and the result is still there when the user comes back.
const TranslateContext = createContext<ReturnType<typeof useTranslateState> | null>(null);

const useTranslateState = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');
  const [tone, setTone] = useState<Tone>('neutral');

  // Snapshots, not per-render derivations. `segments` has to outlive the raw translated text
  // because FA-07 replaces individual paragraphs in it; `sourceSegments` is captured at submit
  // time so it stays index-aligned with `segments` even if the source field is edited afterwards
  // (a shifted index would send the wrong paragraph to /api/retranslate). Both live here rather
  // than in translate.tsx so a retranslated paragraph survives navigating away and back.
  const [segments, setSegments] = useState<string[]>([]);
  const [sourceSegments, setSourceSegments] = useState<string[]>([]);

  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: '/api/translate',
    schema: translationSchema,
    fetch: fetchWithAuthError,
    // Fires once per completed stream, so reacting to a finished translation needs no effect and
    // no "did I already handle this object?" bookkeeping.
    onFinish: ({ object: translation, error }) => {
      if (error || !translation) {
        toast.error('Die Übersetzung war unvollständig. Bitte versuche es erneut.');
        return;
      }
      setSegments(segmentText(translation.translatedText));
    },
    // Only reached when the request itself failed (useObject throws on a non-ok response before
    // any streaming happens) — never in addition to onFinish.
    onError: (error) => {
      const parsed = parseTranslateError(error);
      // Not a toast: the unsupported-language case is surfaced as a dialog, see `unsupportedLanguage`.
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
    },
  });

  const isTooLong = sourceText.length > MAX_SOURCE_TEXT_LENGTH;
  const canSubmit = sourceText.trim().length > 0 && !isTooLong && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSourceSegments(segmentText(sourceText));
    submit({ sourceText, targetLanguage, tone });
  };

  const retranslateSegment = (index: number, translatedText: string) => {
    setSegments((prev) => prev.map((segment, i) => (i === index ? translatedText : segment)));
  };

  const reset = () => {
    clear();
    setSegments([]);
    setSourceSegments([]);
  };

  const translateError = parseTranslateError(error);
  const unsupportedLanguage =
    translateError?.kind === 'unsupported-language' ? translateError.detectedSourceLanguage : null;

  return {
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
    clear: reset,
  };
};

export const TranslateProvider = ({ children }: { children: ReactNode }) => {
  const value = useTranslateState();
  return <TranslateContext.Provider value={value}>{children}</TranslateContext.Provider>;
};

export const useTranslate = () => {
  const context = useContext(TranslateContext);
  if (!context) {
    throw new Error('useTranslate must be used within a TranslateProvider');
  }
  return context;
};
