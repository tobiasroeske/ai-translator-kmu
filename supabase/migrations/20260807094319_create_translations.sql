-- FA-09: persistent translation history, scoped to the owning user via RLS.
create table translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_text text not null,
  source_language text not null,
  target_language text not null,
  tone text,
  translated_text text not null,
  created_at timestamptz not null default now()
);

-- History is fetched sorted by age (newest first) — this index covers exactly
-- the access path app/dashboard/history/page.tsx will use.
create index translations_user_id_created_at_idx on translations (user_id, created_at desc);

alter table translations enable row level security;

-- No "for all" — each operation gets its own policy, so a missing "with check"
-- on insert can't accidentally also permit update, for example. update is
-- deliberately not covered: a re-translation (FA-07) inserts a new row instead
-- of mutating an existing one.

create policy "Users can view their own translations"
  on translations for select
  to authenticated
  using (auth.uid () = user_id);

create policy "Users can insert their own translations"
  on translations for insert
  to authenticated
  with check (auth.uid () = user_id);

create policy "Users can delete their own translations"
  on translations for delete
  to authenticated
  using (auth.uid () = user_id);
