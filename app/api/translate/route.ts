import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { detectLanguage } from '@/lib/ai/detect-language';
import { isSupportedLanguageCode } from '@/lib/ai/languages';
import { MAX_SOURCE_TEXT_LENGTH } from '@/lib/ai/limits';
import { getModel } from '@/lib/ai/provider';
import { translationSchema } from '@/lib/ai/schema';
import { isSupportedTone, toneInstructions } from '@/lib/ai/tone';
import { createClient } from '@/lib/supabase/server';
import { saveTranslation } from '@/lib/translations/history';

type RequestBody = {
  sourceText: string;
  targetLanguage: string;
  tone: string;
};

export const POST = async (req: Request) => {
  const { sourceText, targetLanguage, tone }: RequestBody = await req.json();

  // tone is UI-controlled (EnumSelect only ever sends a valid value) — an invalid value here
  // means a malformed request, not a case the user can trigger through normal use. Guarding it
  // avoids toneInstructions[tone] silently resolving to undefined and corrupting the prompt.
  if (!isSupportedTone(tone)) {
    return Response.json({ error: 'Invalid tone' }, { status: 400 });
  }

  // Backstop for the same limit the UI enforces before submitting — see lib/ai/limits.ts for why
  // the two have to agree.
  if (sourceText.length > MAX_SOURCE_TEXT_LENGTH) {
    return Response.json({ error: 'Source text too long' }, { status: 400 });
  }

  // First call to the AI provider — an unreachable provider surfaces here. Without a catch, the
  // exception reaches Next.js' default handler, which answers with an HTML error page; useObject
  // puts that whole body into error.message, so the client has nothing usable to show.
  let detectedSourceLanguage: string;
  try {
    detectedSourceLanguage = await detectLanguage(sourceText);
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'AI provider unreachable' }, { status: 502 });
  }

  if (!isSupportedLanguageCode(detectedSourceLanguage)) {
    return Response.json({ detectedSourceLanguage }, { status: 422 });
  }

  const supabase = await createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  // Generated here instead of by the column default because the client needs this id to update the
  // row later (FA-07 re-translation), and the insert only happens in onFinish — long after the
  // response headers are gone. Generating it up front is what lets it travel in a header while the
  // row itself doesn't exist yet. Server-side, so no secure-context caveat applies.
  const translationId = crypto.randomUUID();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationSchema }),
    // Translation has one right answer, not many — keep sampling low for consistent output.
    temperature: 0.2,
    // Hard backstop against a runaway generation (same reasoning as /api/retranslate). A
    // translation stays in the ballpark of its source length, so ~4 chars per token doubled leaves
    // room for languages that expand plus the surrounding JSON. A small model that starts
    // repeating itself would otherwise stream until the context window runs out. No separate
    // ceiling needed — the length check above already bounds this.
    maxOutputTokens: Math.ceil(sourceText.length / 2) + 300,
    system:
      'You are a professional business translator.\n\n' +
      'Follow these steps in order:\n' +
      '1. Identify the language the source text is written in. Report it in detectedSourceLanguage as a lowercase ISO 639-1 code (for example: de, en, fr, es, it, pt, nl, pl).\n' +
      `2. Use the following tone in the translation: ${toneInstructions[tone]}\n` +
      '3. Translate the ENTIRE source text into the requested target language. Translate every paragraph, from the first line to the last, and keep the paragraph breaks of the source text. Never stop after the greeting or after only part of the text.\n\n' +
      'Output ONLY the translation itself — no explanations, no comments, no alternate translations, ' +
      'no additional languages, no meta-commentary of any kind.',
    prompt: `Detect the source language and translate the following text to ${targetLanguage}.\n\nText:\n${sourceText}`,
    onError: ({ error }) => console.error(error),
    // result.output rejects when the model output doesn't match the schema (e.g. a truncated
    // response), which would otherwise become an unhandled rejection.
    onFinish: async () => {
      if (!userId) return;
      try {
        const translation = await result.output;
        await saveTranslation(supabase, {
          id: translationId,
          userId,
          sourceText,
          sourceLanguage: translation.detectedSourceLanguage,
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
    // Only sent when there is a user to own the row — without one nothing is inserted in onFinish,
    // so handing out an id would point the client at a row that never exists.
    headers: userId ? { 'X-Translation-Id': translationId } : undefined,
    stream: toTextStream(result),
  });
};
