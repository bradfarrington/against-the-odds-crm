-- ============================================
-- Per-User Color Preferences Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Add user_color column to user_calendars
-- This stores the user's chosen color (never overwritten by Outlook sync).
-- When null, the frontend defaults to white (#ffffff).
alter table user_calendars add column if not exists user_color text default null;

-- 2. Create user_staff_colors table
-- Each user can set their own color for each staff member in the calendar view.
create table if not exists user_staff_colors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references staff(id) on delete cascade,
    staff_id uuid not null references staff(id) on delete cascade,
    color text not null default '#ffffff',
    created_at timestamptz default now(),
    unique(user_id, staff_id)
);

alter table user_staff_colors enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
        and tablename = 'user_staff_colors'
        and policyname = 'Authenticated full access'
    ) then
        create policy "Authenticated full access" on user_staff_colors for all to authenticated using (true) with check (true);
    end if;
end
$$;
