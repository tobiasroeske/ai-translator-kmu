import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { getModel } from '@/lib/ai/provider';
import { retranslateSchema } from '@/lib/ai/schema';
import { isSupportedTone, toneInstructions } from '@/lib/ai/tone';

type RequestBody = {
  segmentText: string;
  comment: string;
  targetLanguage: string;
  tone: string;
};

export const POST = async (req: Request) => {
  const { segmentText, comment, targetLanguage, tone }: RequestBody = await req.json();

  if (!isSupportedTone(tone)) {
    return Response.json({ error: 'Invalid tone' }, { status: 400 });
  }

  // A comment is the whole point of this endpoint, but the "re-translate without a hint" case
  // (user just wants a different phrasing) is still worth supporting — an empty Comment section
  // in the prompt would otherwise read as a dangling label with nothing after it.
  const trimmedComment = comment.trim();
  const commentInstruction = trimmedComment
    ? `Comment: ${trimmedComment}`
    : 'Comment: none — rephrase the Segment using your best judgment.';

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: retranslateSchema }),
    // Same rationale as /api/translate: one right answer per request, not creative variation.
    temperature: 0.2,
    system:
      'You are a professional business translator.\n\n' +
      'Follow these steps in order:\n' +
      `1. Use the following tone in the translation: ${toneInstructions[tone]}\n` +
      '2. Translate the Segment below to the requested target language.\n' +
      '3. The Comment is an instruction about HOW to translate the Segment — follow it. ' +
      'Never translate the Comment itself, it is not part of the text to translate.\n\n' +
      'Output ONLY the translated segment — no explanations, no meta-commentary.',
    prompt:
      `Segment:\n${segmentText}\n\n` +
      `${commentInstruction}\n\n` +
      `Translate the Segment above to ${targetLanguage}.`,
    onError: ({ error }) => console.error(error),
  });

  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
