import { type SupabaseClient } from '@supabase/supabase-js';

import { replaceSegmentAt } from '@/lib/ai/segment';
import { type Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

// Writing the history is always a side effect of a finished generation, never a reason to fail one
// — the translation has already reached the user by the time any of this runs. Everything in here
// is therefore logged rather than thrown.

type NewTranslation = {
  id: string;
  userId: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  tone: string;
  translatedText: string;
};

export const saveTranslation = async (supabase: Client, translation: NewTranslation) => {
  const { error } = await supabase.from('translations').insert({
    id: translation.id,
    user_id: translation.userId,
    source_text: translation.sourceText,
    source_language: translation.sourceLanguage,
    target_language: translation.targetLanguage,
    tone: translation.tone,
    translated_text: translation.translatedText,
  });

  if (error) console.error('Failed to save translation to history:', error);
};

// Read-modify-write on the server: the client reports which paragraph it had re-translated, not
// what the stored document should now contain. That keeps the assembly rule (see lib/ai/segment.ts)
// on one side of the wire and means the update can be validated against what is actually stored.
export const replaceTranslationSegment = async (
  supabase: Client,
  {
    translationId,
    segmentIndex,
    translatedText,
  }: {
    translationId: string;
    segmentIndex: number;
    translatedText: string;
  }
) => {
  const { data: stored, error: readError } = await supabase
    .from('translations')
    .select('translated_text')
    .eq('id', translationId)
    .maybeSingle();

  if (readError) {
    console.error('Failed to read translation for update:', readError);
    return;
  }

  // No row: either the id never made it into the table (the insert after the original translation
  // failed) or it isn't this user's. Both are silent no-ops at the database level, which is exactly
  // how a stale history goes unnoticed — so it is logged here rather than assumed impossible.
  if (!stored) {
    console.error(`Translation ${translationId} not found — re-translation not persisted`);
    return;
  }

  const updatedText = replaceSegmentAt(stored.translated_text, segmentIndex, translatedText);

  if (updatedText === null) {
    console.error(
      `Segment index ${segmentIndex} out of range for translation ${translationId} — re-translation not persisted`
    );
    return;
  }

  const { data: updated, error: updateError } = await supabase
    .from('translations')
    .update({ translated_text: updatedText })
    .eq('id', translationId)
    .select('id');

  // An update that matches nothing is not an error at the database level — asking for the affected
  // rows back is the only way to tell "written" apart from "silently discarded".
  if (updateError || updated?.length === 0) {
    console.error('Failed to persist re-translation:', updateError ?? 'no rows updated');
  }
};
