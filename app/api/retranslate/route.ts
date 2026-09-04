import { createTextStreamResponse, Output, streamText, toTextStream } from 'ai';

import { retranslateRequestSchema } from '@/app/api/retranslate/schema';
import { outputTokenBudget } from '@/lib/ai/limits';
import { buildRetranslateSystemPrompt, buildRetranslateUserPrompt } from '@/lib/ai/prompts';
import { getModel, MODEL_TEMPERATURE } from '@/lib/ai/provider';
import { translationOutputSchema } from '@/lib/ai/schema';
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

  const { currentTranslation, comment, targetLanguage, tone, translationId, segmentIndex } =
    parsed.data;

  // Created before streaming starts: it reads the request cookies, which onFinish can no longer
  // reach once the response is on its way.
  const supabase = await createClient();

  const result = streamText({
    model: getModel(),
    output: Output.object({ schema: translationOutputSchema }),
    temperature: MODEL_TEMPERATURE,
    maxOutputTokens: outputTokenBudget(currentTranslation.length),
    // The model revises the paragraph as it currently reads instead of translating anything again:
    // a blind re-translation has no reason to preserve what the comment didn't mention, while
    // anchoring on the current translation makes the comment the edit instruction it already is.
    system: buildRetranslateSystemPrompt(tone),
    prompt: buildRetranslateUserPrompt({ currentTranslation, comment, targetLanguage }),
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
