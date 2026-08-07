import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { detectLanguage } from '@/lib/ai/detect-language';
import { isSupportedLanguageCode } from '@/lib/ai/languages';
import { getModel } from '@/lib/ai/provider';
import { translationSchema } from '@/lib/ai/schema';
import { isSupportedTone, toneInstructions } from '@/lib/ai/tone';
import { createClient } from '@/lib/supabase/server';

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

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationSchema }),
    // Translation has one right answer, not many — keep sampling low for consistent output.
    temperature: 0.2,
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
    // History is a side effect of a finished translation, never a reason to fail one — the stream
    // has already reached the client by the time this runs, so everything in here is logged
    // rather than surfaced. result.output rejects when the model output doesn't match the schema
    // (e.g. a truncated response), which would otherwise become an unhandled rejection.
    onFinish: async () => {
      if (!userId) return;
      try {
        const translation = await result.output;
        const { error } = await supabase.from('translations').insert({
          user_id: userId,
          source_text: sourceText,
          source_language: translation.detectedSourceLanguage,
          target_language: targetLanguage,
          tone,
          translated_text: translation.translatedText,
        });
        if (error) console.error('Failed to save translation to history:', error);
      } catch (error) {
        console.error('Failed to save translation to history:', error);
      }
    },
  });
  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
