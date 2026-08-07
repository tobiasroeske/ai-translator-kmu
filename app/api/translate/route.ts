import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { detectLanguage } from '@/lib/ai/detect-language';
import { isSupportedLanguageCode } from '@/lib/ai/languages';
import { getModel } from '@/lib/ai/provider';
import { translationSchema } from '@/lib/ai/schema';
import { type Tone, toneInstructions } from '@/lib/ai/tone';

type RequestBody = {
  sourceText: string;
  targetLanguage: string;
  tone: Tone;
};

export const POST = async (req: Request) => {
  const { sourceText, targetLanguage, tone }: RequestBody = await req.json();

  const detectedSourceLanguage = await detectLanguage(sourceText);

  if (!isSupportedLanguageCode(detectedSourceLanguage)) {
    return Response.json({ detectedSourceLanguage }, { status: 422 });
  }

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
  });
  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
