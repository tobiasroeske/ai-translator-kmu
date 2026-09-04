import { AUTH_ERROR } from '@/lib/ai/auth-fetch';

// The error contract between the translation routes and the client. Both sides import these codes
// so a failure is identified by what it is, not by which fields happen to be present in the body.
export const translateErrorCodes = {
  invalidRequest: 'invalid_request',
  unsupportedLanguage: 'unsupported_language',
  providerUnavailable: 'provider_unavailable',
} as const;

export type TranslateErrorCode = (typeof translateErrorCodes)[keyof typeof translateErrorCodes];

export type TranslateErrorBody = {
  error: TranslateErrorCode;
  // Only set on unsupportedLanguage: the code that was detected but isn't in the FA-06 catalog.
  detectedSourceLanguage?: string;
};

export type TranslateError =
  | { kind: 'unsupported-language'; detectedSourceLanguage: string }
  | { kind: 'auth' }
  | { kind: 'provider-unavailable' }
  | { kind: 'generic' };

// useObject puts the raw response body into error.message, which is only JSON for the errors the
// route returns deliberately — anything else (an HTML error page, a network failure) lands here
// too. Classifying it in one place keeps that raw text out of the UI; the route logs the cause.
export const parseTranslateError = (error: Error | undefined): TranslateError | null => {
  if (!error) return null;
  if (error.message.includes(AUTH_ERROR)) return { kind: 'auth' };

  try {
    const body = JSON.parse(error.message) as Partial<TranslateErrorBody>;
    if (
      body.error === translateErrorCodes.unsupportedLanguage &&
      typeof body.detectedSourceLanguage === 'string'
    ) {
      return { kind: 'unsupported-language', detectedSourceLanguage: body.detectedSourceLanguage };
    }
    // Whichever provider is configured (see lib/ai/provider.ts) — the client has no way to know
    // which without the message assuming one, so the copy for this case must stay provider-neutral.
    if (body.error === translateErrorCodes.providerUnavailable) {
      return { kind: 'provider-unavailable' };
    }
  } catch {
    // Body isn't JSON — nothing to extract, fall through to the generic case.
  }

  return { kind: 'generic' };
};
