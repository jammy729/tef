-- One table, one JSONB blob per user (spec §4/§5) — mirrors the exact shape src/lib/storage.js
-- already keeps client-side (sessions, errorStats, lessonProgress, learningProgress, meta).
-- RLS: auth.uid() = id is the sole ownership rule, per Supabase's security checklist
-- (TO authenticated + explicit WITH CHECK on update).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ( (select auth.uid()) = id );

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ( (select auth.uid()) = id );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );
