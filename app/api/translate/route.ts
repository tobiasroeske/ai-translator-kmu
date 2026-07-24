import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { getModel } from '@/lib/ai/provider';
import { translationSchema } from '@/lib/ai/schema';

export const POST = async (req: Request) => {
  const { sourceText, targetLanguage }: { sourceText: string; targetLanguage: string } =
    await req.json();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationSchema }),
    system:
      'You are a professional business translator. Translate the given text exactly as provided. ' +
      'Output ONLY the translation itself — no explanations, no comments, no alternate translations, ' +
      'no additional languages, no meta-commentary of any kind.',
    prompt: `Detect the source language and translate the following text to ${targetLanguage}.\n\nText:\n${sourceText}`,
  });
  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
