import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { retranslateRequestSchema } from '@/app/api/retranslate/schema';
import { promptLanguageNames } from '@/lib/ai/languages';
import { outputTokenBudget } from '@/lib/ai/limits';
import { getModel } from '@/lib/ai/provider';
import { translationOutputSchema } from '@/lib/ai/schema';
import { toneInstructions } from '@/lib/ai/tone';
import { translateErrorCodes } from '@/lib/ai/translate-error';
import { createClient } from '@/lib/supabase/server';
import { replaceTranslationSegment } from '@/lib/translations/history';

export const maxDuration = 120;

export const POST = async (req: Request) => {
  const body: unknown = await req.json().catch(() => null);
  const parsed = retranslateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: translateErrorCodes.invalidRequest }, { status: 400 });
  }

  const {
    currentTranslation,
    segmentText,
    sourceLanguage,
    comment,
    targetLanguage,
    tone,
    translationId,
    segmentIndex,
  } = parsed.data;

  // A comment is the whole point of this endpoint, but the "re-translate without a hint" case
  // (user just wants a different phrasing) is still worth supporting — an empty Comment section
  // in the prompt would otherwise read as a dangling label with nothing after it.
  const commentInstruction = comment ? comment : 'Improve the phrasing using your best judgment.';

  // Only shown when the original paragraph could be identified. Omitted rather than guessed: an
  // unrelated Source paragraph would pull the revision away from the text being revised.
  const sourceSection = segmentText
    ? `Source${sourceLanguage ? ` (${promptLanguageNames[sourceLanguage]})` : ''}:\n${segmentText}\n\n`
    : '';

  // Created before streaming starts: it reads the request cookies, which onFinish can no longer
  // reach once the response is on its way.
  const supabase = await createClient();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationOutputSchema }),
    // Same rationale as /api/translate: one right answer per request, not creative variation.
    temperature: 0.2,
    maxOutputTokens: outputTokenBudget(currentTranslation.length),
    // The model revises the paragraph as it currently reads instead of translating the source
    // again. The source is matched to this paragraph by position and can be the wrong one, and a
    // blind re-translation has no reason to preserve what the comment didn't mention — anchoring
    // on the current translation makes the comment the edit instruction it already is.
    system:
      'You are a professional business translator. You revise ONE paragraph of an existing ' +
      'translation according to a comment from the user.\n\n' +
      `Tone: ${toneInstructions[tone]}\n\n` +
      'Apply the comment to the paragraph and keep everything it does not mention as it is. ' +
      'Return the complete revised paragraph — every sentence, not only the part the comment ' +
      'refers to. Output the paragraph itself, nothing else: no explanations, no alternative ' +
      'versions, no meta-commentary.',
    prompt:
      sourceSection +
      `Current translation (${promptLanguageNames[targetLanguage]}):\n${currentTranslation}\n\n` +
      `Comment:\n${commentInstruction}\n\n` +
      `Revise the translation into ${promptLanguageNames[targetLanguage]}.`,
    onError: ({ error }) => console.error(error),
    // Same shape as /api/translate: whoever generates the text is also the one who stores it, so
    // the client never has to describe what the persisted document should look like.
    onFinish: async () => {
      if (!translationId) return;
      try {
        const retranslation = await result.output;

        // The schema guarantees a string, not a non-empty one. Writing an empty revision would
        // erase a paragraph the user still has on screen.
        if (retranslation.translatedText.trim().length === 0) return;

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
