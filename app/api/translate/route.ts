import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { translateRequestSchema } from '@/app/api/translate/schema';
import { detectLanguage } from '@/lib/ai/detect-language';
import { isSupportedLanguageCode } from '@/lib/ai/languages';
import { outputTokenBudget } from '@/lib/ai/limits';
import { buildTranslateSystemPrompt, buildTranslateUserPrompt } from '@/lib/ai/prompts';
import { getModel, MODEL_TEMPERATURE } from '@/lib/ai/provider';
import { translationOutputSchema } from '@/lib/ai/schema';
import { translateErrorCodes } from '@/lib/ai/translate-error';
import { createClient } from '@/lib/supabase/server';
import { saveTranslation } from '@/lib/translations/history';

// A translation of a full page of text against a local model takes well over the platform default.
// Without this the response is cut off mid-stream once deployed, which never shows up in local dev.
export const maxDuration = 120;

export const POST = async (req: Request) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = translateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: translateErrorCodes.invalidRequest }, { status: 400 });
  }

  const { sourceText, targetLanguage, tone } = parsed.data;

  // First call to the AI provider — an unreachable provider surfaces here. Without a catch, the
  // exception reaches Next.js' default handler, which answers with an HTML error page; useObject
  // puts that whole body into error.message, so the client has nothing usable to show.
  let detectedSourceLanguage: string;
  try {
    detectedSourceLanguage = await detectLanguage(sourceText);
  } catch (error) {
    console.error(error);
    return Response.json({ error: translateErrorCodes.providerUnavailable }, { status: 502 });
  }

  if (!isSupportedLanguageCode(detectedSourceLanguage)) {
    return Response.json(
      { error: translateErrorCodes.unsupportedLanguage, detectedSourceLanguage },
      { status: 422 }
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  // The proxy already answers /api/* with a 401 when there is no session, so this is a second lock
  // on the same door rather than a user-facing path. It is here because everything below assumes an
  // owner for the history row — that assumption should fail loudly if the proxy ever stops holding.
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generated here instead of by the column default because the client needs this id to update the
  // row later (FA-07 re-translation), and the insert only happens in onFinish — long after the
  // response headers are gone. Generating it up front is what lets it travel in a header while the
  // row itself doesn't exist yet. Server-side, so no secure-context caveat applies.
  const translationId = crypto.randomUUID();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationOutputSchema }),
    temperature: MODEL_TEMPERATURE,
    maxOutputTokens: outputTokenBudget(sourceText.length),
    system: buildTranslateSystemPrompt(tone),
    // The source language is stated rather than left to be inferred: it has already been
    // established and validated against the FA-06 catalog, so spending the model's attention on it
    // again would only risk a different answer.
    prompt: buildTranslateUserPrompt({ sourceText, detectedSourceLanguage, targetLanguage }),
    onError: ({ error }) => console.error(error),
    // result.output rejects when the model output doesn't match the schema (e.g. a truncated
    // response), which would otherwise become an unhandled rejection.
    onFinish: async () => {
      try {
        const translation = await result.output;
        await saveTranslation(supabase, {
          id: translationId,
          userId,
          sourceText,
          sourceLanguage: detectedSourceLanguage,
          targetLanguage,
          tone,
          translatedText: translation.translatedText,
        });
      } catch (error) {
        console.error('Failed to save translation to history:', error);
      }
    },
  });

  return createTextStreamResponse({
    headers: {
      'X-Translation-Id': translationId,
      // The validated detection result, not a second opinion from the translation call.
      'X-Detected-Source-Language': detectedSourceLanguage,
    },
    stream: toTextStream(result),
  });
};
