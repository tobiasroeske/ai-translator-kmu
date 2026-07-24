import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { getModel } from '@/lib/ai/provider';
import { translationSchema } from '@/lib/ai/schema';

export const POST = async (req: Request) => {
  const { sourceText, targetLanguage }: { sourceText: string; targetLanguage: string } =
    await req.json();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationSchema }),
    prompt: `Translate the following text to ${targetLanguage}. Also detect the source language.\n\nText:\n${sourceText}`,
  });
  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
