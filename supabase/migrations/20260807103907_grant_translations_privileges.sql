-- Table-level privileges are a separate layer from the RLS policies in the create
-- migration: RLS decides which rows a role may touch, GRANT decides whether it may
-- touch the table at all. Without this, every insert fails with 42501 before any
-- policy is evaluated.
--
-- No update (there is no update policy — FA-07 re-translation inserts a new row)
-- and nothing for anon (the route is authenticated-only).
grant select, insert, delete on table public.translations to authenticated;
