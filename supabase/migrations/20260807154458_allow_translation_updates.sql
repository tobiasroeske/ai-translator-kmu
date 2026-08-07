-- Reverses the "no update" decision of 20260807094319_create_translations.sql. That migration
-- assumed a re-translation (FA-07) would insert a new row; refining four paragraphs of one
-- document would then leave five near-identical rows, working against the findable history FA-09
-- asks for. A re-translation refines an existing translation, so the history row is updated in
-- place and always reflects what the user actually ended up with.
--
-- "with check" as well as "using": without it a user could pass the row-ownership check and then
-- reassign user_id, moving their row into someone else's history.
create policy "Users can update their own translations"
  on translations for update
  to authenticated
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

-- GRANT (table level) and RLS (row level) are separate layers — the policy above is never even
-- evaluated without this.
grant update on table public.translations to authenticated;
