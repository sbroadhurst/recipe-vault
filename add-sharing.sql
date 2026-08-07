-- ============================================================
-- Recipe Vault: adds recipe sharing to an existing database
-- Only needed if you already ran supabase-setup.sql before this
-- feature existed. Run once in the Supabase SQL Editor.
-- ============================================================

alter table recipes
  add column if not exists is_public boolean not null default false;

-- Anyone (including logged-out visitors) can view a recipe that has
-- been marked shareable, for the public share-link page
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'recipes' and policyname = 'Public can view shared recipes'
  ) then
    create policy "Public can view shared recipes" on recipes for select using (is_public = true);
  end if;
end $$;
