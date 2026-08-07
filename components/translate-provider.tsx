'use client';

import { useObject } from '@ai-sdk/react';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';
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

// What the user is about to translate. Separated from the stream below because the two change on
// completely different rhythms — this one on every keystroke, the other once per request.
const useTranslateForm = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');
  const [tone, setTone] = useState<Tone>('neutral');

  return {
    sourceText,
    setSourceText,
    targetLanguage,
    setTargetLanguage,
    tone,
    setTone,
    isTooLong: sourceText.length > MAX_SOURCE_TEXT_LENGTH,
  };
};

type TranslateForm = ReturnType<typeof useTranslateForm>;

// The translation itself: the running request, the resulting document, and the history row it was
// saved as. Persistence is deliberately absent — both routes store what they generate (see
// lib/translations/history.ts), so nothing here describes what the database should contain.
const useTranslationStream = ({ sourceText, targetLanguage, tone, isTooLong }: TranslateForm) => {
  // `segments` is the document the user sees, and FA-07 replaces individual paragraphs in it, so it
  // outlives the raw translated text it was derived from. `sourceSegments` is captured at submit
  // time to stay index-aligned with it even if the source field is edited afterwards — a shifted
  // index would send the wrong paragraph to /api/retranslate.
  const [segments, setSegments] = useState<string[]>([]);
  const [sourceSegments, setSourceSegments] = useState<string[]>([]);
  // Row id of the history entry this translation was saved as, handed over by the route in a
  // response header (see app/api/translate/route.ts). Null while unauthenticated or before the
  // first response — a re-translation then simply isn't persisted rather than failing.
  const [translationId, setTranslationId] = useState<string | null>(null);

  const { object, submit, isLoading, error, stop, clear } = useObject({
    api: '/api/translate',
    schema: translationSchema,
    // Wraps the shared helper only to pick the row id out of the headers on the way through —
    // useObject exposes the streamed body, not the response itself.
    fetch: async (input, init) => {
      const response = await fetchWithAuthError(input, init);
      setTranslationId(response.headers.get('X-Translation-Id'));
      return response;
    },
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
      // Not a toast: the unsupported-language case is surfaced as a dialog, see below.
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

  const canSubmit = sourceText.trim().length > 0 && !isTooLong && !isLoading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSourceSegments(segmentText(sourceText));
    submit({ sourceText, targetLanguage, tone });
  };

  // Stable identity on purpose: it is handed to every TranslationSegment, which is memoised, and a
  // callback recreated per render would defeat that on every keystroke in the source field.
  const replaceSegment = useCallback((index: number, translatedText: string) => {
    setSegments((prev) => prev.map((segment, i) => (i === index ? translatedText : segment)));
  }, []);

  const reset = () => {
    clear();
    setSegments([]);
    setSourceSegments([]);
    setTranslationId(null);
  };

  const translateError = parseTranslateError(error);

  return {
    object,
    isLoading,
    canSubmit,
    handleSubmit,
    stop,
    clear: reset,
    segments,
    sourceSegments,
    translationId,
    replaceSegment,
    unsupportedLanguage:
      translateError?.kind === 'unsupported-language'
        ? translateError.detectedSourceLanguage
        : null,
  };
};

// Lives above the routed pages (see app/dashboard/layout.tsx) instead of inside translate.tsx, so
// navigating to /dashboard/history and back doesn't unmount it — a translation in progress keeps
// streaming, and the result is still there when the user comes back.
type TranslateContextValue = TranslateForm & ReturnType<typeof useTranslationStream>;

const TranslateContext = createContext<TranslateContextValue | null>(null);

export const TranslateProvider = ({ children }: { children: ReactNode }) => {
  const form = useTranslateForm();
  const stream = useTranslationStream(form);
  return (
    <TranslateContext.Provider value={{ ...form, ...stream }}>{children}</TranslateContext.Provider>
  );
};

export const useTranslate = () => {
  const context = useContext(TranslateContext);
  if (!context) {
    throw new Error('useTranslate must be used within a TranslateProvider');
  }
  return context;
};
