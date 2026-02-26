-- Add multi-calendar support
-- Creates user_calendars table and adds graph_calendar_id to appointments

-- 1. Table to store each user's Microsoft calendar list
create table if not exists user_calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references staff(id) on delete cascade,
  graph_calendar_id text not null,
  name text not null,
  color text default '#0078d4',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, graph_calendar_id)
);

alter table user_calendars enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'user_calendars'
    and policyname = 'Authenticated full access'
  ) then
    create policy "Authenticated full access" on user_calendars for all to authenticated using (true) with check (true);
  end if;
end
$$;

-- 2. Tag appointments with which calendar they belong to
alter table appointments add column if not exists graph_calendar_id text;
