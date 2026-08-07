-- ============================================================
-- Recipe Vault: adds favoriting to an existing database
-- Only needed if you already ran supabase-setup.sql before this
-- feature existed. Run once in the Supabase SQL Editor.
-- ============================================================

alter table recipes
  add column if not exists is_favorite boolean not null default false;
