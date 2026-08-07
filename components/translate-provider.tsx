'use client';

import { useObject } from '@ai-sdk/react';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AUTH_ERROR, fetchWithAuthError } from '@/lib/ai/auth-fetch';
import { type LanguageCode } from '@/lib/ai/languages';
import { translationSchema } from '@/lib/ai/schema';
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
    handleSubmit,
    unsupportedLanguage,
    clear,
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
