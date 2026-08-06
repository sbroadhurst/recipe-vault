-- ============================================================
-- Recipe Vault: Supabase setup script
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  ingredients text not null,
  instructions text not null,
  source_url text,
  image_url text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security so users can only see their own recipes
alter table recipes enable row level security;

create policy "Users can view their own recipes"
  on recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recipes"
  on recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own recipes"
  on recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete their own recipes"
  on recipes for delete
  using (auth.uid() = user_id);
