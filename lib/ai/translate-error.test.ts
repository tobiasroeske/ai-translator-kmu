import { describe, expect, it } from 'vitest';

import { AUTH_ERROR } from '@/lib/ai/auth-fetch';
import { parseTranslateError, translateErrorCodes } from '@/lib/ai/translate-error';

describe('parseTranslateError', () => {
  it('reports no error when there is none', () => {
    expect(parseTranslateError(undefined)).toBeNull();
  });

  it('recognises an expired session', () => {
    expect(parseTranslateError(new Error(AUTH_ERROR))).toEqual({ kind: 'auth' });
  });

  it('extracts the detected language from an unsupported-language response', () => {
    const body = JSON.stringify({
      error: translateErrorCodes.unsupportedLanguage,
      detectedSourceLanguage: 'it',
    });

    expect(parseTranslateError(new Error(body))).toEqual({
      kind: 'unsupported-language',
      detectedSourceLanguage: 'it',
    });
  });

  it('does not read an unsupported language out of a different error code', () => {
    const body = JSON.stringify({
      error: translateErrorCodes.invalidRequest,
      detectedSourceLanguage: 'it',
    });

    expect(parseTranslateError(new Error(body))).toEqual({ kind: 'generic' });
  });

  // The case this function exists for: anything that isn't one of the deliberate error responses
  // must not reach the UI as raw text.
  it('falls back to generic for an HTML error page', () => {
    const error = new Error('<!DOCTYPE html><html><body>Internal Server Error</body></html>');
    expect(parseTranslateError(error)).toEqual({ kind: 'generic' });
  });

  it('falls back to generic for JSON that is not an error body', () => {
    expect(parseTranslateError(new Error('{"unrelated":true}'))).toEqual({ kind: 'generic' });
    expect(parseTranslateError(new Error('null'))).toEqual({ kind: 'generic' });
  });

  // provider_unavailable is the route's 502 when the provider (Ollama or Mistral, whichever is
  // configured) is unreachable — a distinct case from "some other failure", because the toast
  // for it must not name a specific provider the client has no way to know is even the active one.
  it('recognises a provider-unavailable response', () => {
    const body = JSON.stringify({ error: translateErrorCodes.providerUnavailable });
    expect(parseTranslateError(new Error(body))).toEqual({ kind: 'provider-unavailable' });
  });

  // A timeout or a rate limit never reaches the route's own error bodies: fetch throws, or a
  // gateway returns a body this app didn't write. Neither may surface as raw text in the UI.
  it('falls back to generic for a fetch timeout', () => {
    const timeout = new DOMException('The operation was aborted.', 'AbortError');
    expect(parseTranslateError(timeout)).toEqual({ kind: 'generic' });
  });

  it('falls back to generic for a rate-limit response with an unrecognised body', () => {
    const rateLimited = new Error('{"message":"Too Many Requests","statusCode":429}');
    expect(parseTranslateError(rateLimited)).toEqual({ kind: 'generic' });
  });
});
