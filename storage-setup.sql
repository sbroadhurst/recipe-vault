-- ============================================================
-- Recipe Vault: Supabase Storage setup for uploaded photos
-- Run this once in your Supabase project's SQL Editor, in
-- addition to supabase-setup.sql
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

-- Create a public bucket to hold recipe photos
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Anyone can view recipe photos (needed to display them in the app)
create policy "Public read access for recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

-- Users can only upload into their own folder (path starts with their user id)
create policy "Users can upload their own recipe images"
  on storage.objects for insert
  with check (
    bucket_id = 'recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own recipe images"
  on storage.objects for update
  using (
    bucket_id = 'recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own recipe images"
  on storage.objects for delete
  using (
    bucket_id = 'recipe-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
