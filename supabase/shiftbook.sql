-- Shiftbook: one row per person. Paste this whole file into Supabase > SQL Editor and click Run.
-- Safe to run more than once.

create table if not exists public.shiftbook_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  calendar_token text not null unique
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
    check (length(calendar_token) >= 32),
  updated_at timestamptz not null default now()
);

alter table public.shiftbook_state enable row level security;

-- Each signed-in person can only see and change their own row.
drop policy if exists "own row: read" on public.shiftbook_state;
create policy "own row: read" on public.shiftbook_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own row: create" on public.shiftbook_state;
create policy "own row: create" on public.shiftbook_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "own row: update" on public.shiftbook_state;
create policy "own row: update" on public.shiftbook_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.shiftbook_state from anon;
grant select, insert, update on public.shiftbook_state to authenticated;

-- Calendar feed lookup. Calendar apps can't sign in, so the private token in the link is the key.
-- Returns that one person's data for an exact token match, nothing else.
create or replace function public.shiftbook_feed(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.data
  from public.shiftbook_state s
  where length(p_token) >= 32 and s.calendar_token = p_token
$$;

revoke all on function public.shiftbook_feed(text) from public;
grant execute on function public.shiftbook_feed(text) to anon, authenticated;
