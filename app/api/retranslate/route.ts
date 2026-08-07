import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { getModel } from '@/lib/ai/provider';
import { retranslateSchema } from '@/lib/ai/schema';
import { isSupportedTone, toneInstructions } from '@/lib/ai/tone';
import { createClient } from '@/lib/supabase/server';
import { replaceTranslationSegment } from '@/lib/translations/history';

type RequestBody = {
  segmentText: string;
  comment: string;
  targetLanguage: string;
  tone: string;
  // Which paragraph of which stored translation this refines. Null when the original translation
  // was never persisted (no session, or the insert failed) — the re-translation still runs, it just
  // isn't written anywhere.
  translationId: string | null;
  segmentIndex: number;
};

export const POST = async (req: Request) => {
  const { segmentText, comment, targetLanguage, tone, translationId, segmentIndex }: RequestBody =
    await req.json();

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

  // Created before streaming starts: it reads the request cookies, which onFinish can no longer
  // reach once the response is on its way.
  const supabase = await createClient();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: retranslateSchema }),
    // Same rationale as /api/translate: one right answer per request, not creative variation.
    temperature: 0.2,
    // Hard backstop against a runaway generation. A segment is one paragraph, so the translation
    // can't legitimately be much longer than the input — roughly 4 chars per token, doubled for
    // languages that expand plus the surrounding JSON. Without this a small model that starts
    // repeating itself or continuing the letter streams until the context window runs out; the
    // prompt rules below discourage that, the token cap makes it impossible.
    maxOutputTokens: Math.min(1500, Math.ceil(segmentText.length / 2) + 200),
    system:
      'You are a professional business translator. You translate exactly ONE paragraph per request.\n\n' +
      'Rules:\n' +
      `1. Tone: ${toneInstructions[tone]}\n` +
      '2. Translate the Segment below — all of it, and nothing but it. Never continue the text past ' +
      'the end of the Segment, never add sentences, greetings or closings that are not in it.\n' +
      '3. The Comment is an instruction about HOW to translate the Segment — follow it. Never ' +
      'translate the Comment itself and never mention it in your output.\n' +
      '4. The result is a single paragraph of roughly the same length as the Segment. Once you have ' +
      'translated the last sentence of the Segment, you are done.\n\n' +
      'Output ONLY the translated paragraph — no explanations, no alternative versions, no ' +
      'repetitions, no meta-commentary.',
    prompt:
      `Segment:\n${segmentText}\n\n` +
      `${commentInstruction}\n\n` +
      `Translate the Segment above to ${targetLanguage}. Stop at the end of the Segment.`,
    onError: ({ error }) => console.error(error),
    // Same shape as /api/translate: whoever generates the text is also the one who stores it, so
    // the client never has to describe what the persisted document should look like.
    onFinish: async () => {
      if (!translationId) return;
      try {
        const retranslation = await result.output;
        await replaceTranslationSegment(supabase, {
          translationId,
          segmentIndex,
          translatedText: retranslation.translatedText,
        });
      } catch (error) {
        console.error('Failed to persist re-translation:', error);
      }
    },
  });

  return createTextStreamResponse({
    stream: toTextStream(result),
  });
};
