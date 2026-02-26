-- ============================================
-- Against the Odds CRM — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. STAFF
-- ============================================
create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  role text not null default '',
  dashboard_role text not null default 'admin',
  email text unique not null,
  phone text default '',
  department text default 'Operations',
  status text default 'Active',
  bio text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 2. COMPANIES
-- ============================================
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default '',
  industry text default '',
  address text default '',
  phone text default '',
  email text default '',
  website text default '',
  status text default 'Active',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 3. CONTACTS
-- ============================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete set null,
  first_name text not null,
  last_name text not null,
  role text default '',
  email text default '',
  phone text default '',
  status text default 'Active',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 4. RECOVERY SEEKERS
-- ============================================
create table if not exists recovery_seekers (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  email text default '',
  phone text default '',
  address text default '',
  gender text default '',
  referral_source text default '',
  status text default 'Active',
  risk_level text default 'Medium',
  gambling_type text default '',
  gambling_frequency text default '',
  gambling_duration text default '',
  gambling_triggers text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 5. SUBSTANCE USE (child of recovery_seekers)
-- ============================================
create table if not exists substance_use (
  id uuid primary key default uuid_generate_v4(),
  seeker_id uuid not null references recovery_seekers(id) on delete cascade,
  substance text not null,
  frequency text default '',
  duration text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 6. COACHING SESSIONS (child of recovery_seekers)
-- ============================================
create table if not exists coaching_sessions (
  id uuid primary key default uuid_generate_v4(),
  seeker_id uuid not null references recovery_seekers(id) on delete cascade,
  date date not null,
  notes text default '',
  progress_rating integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- 7. CAMPAIGNS
-- ============================================
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default '',
  status text default 'Draft',
  audience text default '',
  subject text default '',
  scheduled_date timestamptz,
  sent_count integer default 0,
  open_count integer default 0,
  click_count integer default 0,
  description text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 8. PROJECTS
-- ============================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default '',
  status text default 'Active',
  company_id uuid references companies(id) on delete set null,
  lead_id uuid references staff(id) on delete set null,
  description text default '',
  start_date date,
  end_date date,
  budget numeric(12,2) default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 9. TASKS
-- ============================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  status text default 'To Do',
  priority text default 'Medium',
  assignee_id uuid references staff(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  due_date date,
  description text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 10. CONTRACTS
-- ============================================
create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  company_id uuid references companies(id) on delete set null,
  status text default 'Active',
  value numeric(12,2) default 0,
  start_date date,
  end_date date,
  renewal_date date,
  type text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 11. MEETING NOTES
-- ============================================
create table if not exists meeting_notes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  meeting_type text default '',
  date timestamptz,
  company_id uuid references companies(id) on delete set null,
  location text default '',
  agenda text default '',
  notes text default '',
  action_items text default '',
  created_at timestamptz default now()
);

-- Junction: meeting note ↔ contacts
create table if not exists meeting_note_contacts (
  meeting_note_id uuid not null references meeting_notes(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  primary key (meeting_note_id, contact_id)
);

-- Junction: meeting note ↔ staff attendees
create table if not exists meeting_note_staff (
  meeting_note_id uuid not null references meeting_notes(id) on delete cascade,
  staff_id uuid not null references staff(id) on delete cascade,
  primary key (meeting_note_id, staff_id)
);

-- ============================================
-- 12. PREVENTION SCHEDULE (workshops)
-- ============================================
create table if not exists prevention_schedule (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  workshop_type text default '',
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  facilitator_id uuid references staff(id) on delete set null,
  date timestamptz,
  end_time timestamptz,
  location text default '',
  status text default 'Scheduled',
  attendee_count integer,
  max_capacity integer default 30,
  notes text default '',
  feedback text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 13. INVOICES
-- ============================================
create table if not exists invoices (
  id uuid primary key default uuid_generate_v4(),
  invoice_number text not null,
  company_id uuid references companies(id) on delete set null,
  amount numeric(12,2) default 0,
  status text default 'Draft',
  category text default '',
  date_issued date,
  date_due date,
  date_paid date,
  description text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 14. TARGETS
-- ============================================
create table if not exists targets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text default '',
  metric text default '',
  current_value numeric(12,2) default 0,
  goal_value numeric(12,2) default 0,
  deadline date,
  description text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 15. TEMPLATES
-- ============================================
create table if not exists templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text default '',
  content text default '',
  description text default '',
  created_at timestamptz default now()
);

-- ============================================
-- 16. PREVENTION RESOURCES
-- ============================================
create table if not exists prevention_resources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  workshop_type text default '',
  file_type text default '',
  description text default '',
  uploaded_at timestamptz default now(),
  size text default ''
);

-- ============================================
-- 17. RECOVERY RESOURCES
-- ============================================
create table if not exists recovery_resources (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text default '',
  file_type text default '',
  description text default '',
  uploaded_at timestamptz default now(),
  size text default ''
);


-- ============================================
-- 18. PROJECT STAFF (junction: projects ↔ staff)
-- Run these ALTER/CREATE statements in Supabase SQL Editor
-- ============================================

-- alter table projects add column if not exists image_url text default '';
-- alter table projects add column if not exists directions text default '';

-- Add assigned_by_id to tasks (who delegated the task)
alter table tasks add column if not exists assigned_by_id uuid references staff(id) on delete set null;

-- create table if not exists project_staff (
--   project_id uuid not null references projects(id) on delete cascade,
--   staff_id   uuid not null references staff(id) on delete cascade,
--   primary key (project_id, staff_id)
-- );
-- alter table project_staff enable row level security;
-- create policy "Authenticated full access" on project_staff
--   for all to authenticated using (true) with check (true);

-- ============================================
-- 19. TASK CATEGORIES
-- ============================================

create table if not exists task_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table task_categories enable row level security;

-- Add category column to tasks
alter table tasks add column if not exists category text default '';

-- Seed default categories
insert into task_categories (name, sort_order) values
  ('Social Media', 0),
  ('Clients', 1),
  ('Business Dev', 2),
  ('Recovery Services', 3),
  ('Team', 4),
  ('Projects', 5)
on conflict do nothing;

-- ============================================
-- 20. MICROSOFT OAUTH CONNECTIONS
-- ============================================
create table if not exists user_oauth_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references staff(id) on delete cascade,
  microsoft_email text not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- 21. CONTACT EMAILS
-- ============================================
create table if not exists contact_emails (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid not null references staff(id) on delete set null,
  graph_message_id text unique not null,
  conversation_id text not null,
  direction text not null, -- 'inbound' or 'outbound'
  subject text default '',
  body_html text default '',
  sender_address text not null,
  recipients jsonb not null default '[]'::jsonb,
  timestamp timestamptz not null,
  has_attachments boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Only authenticated users can access data
-- ============================================

alter table staff enable row level security;
alter table companies enable row level security;
alter table contacts enable row level security;
alter table recovery_seekers enable row level security;
alter table substance_use enable row level security;
alter table coaching_sessions enable row level security;
alter table campaigns enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table contracts enable row level security;
alter table meeting_notes enable row level security;
alter table meeting_note_contacts enable row level security;
alter table meeting_note_staff enable row level security;
alter table prevention_schedule enable row level security;
alter table invoices enable row level security;
alter table targets enable row level security;
alter table templates enable row level security;
alter table prevention_resources enable row level security;
alter table recovery_resources enable row level security;
alter table user_oauth_connections enable row level security;
alter table contact_emails enable row level security;

-- Policy: authenticated users can do everything (team-internal CRM)
-- Allow staff to see if they are connected
do $$
begin
  if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
      and tablename = 'user_oauth_connections' 
      and policyname = 'Users can view their own connections'
  ) then
      create policy "Users can view their own connections" on user_oauth_connections for select to authenticated using (user_id = auth.uid());
  end if;
end
$$;

-- Repeat for each table:
do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'staff','companies','contacts','recovery_seekers','substance_use',
      'coaching_sessions','campaigns','projects','tasks','contracts',
      'meeting_notes','meeting_note_contacts','meeting_note_staff',
      'prevention_schedule','invoices','targets','templates',
      'prevention_resources','recovery_resources','task_categories',
      'user_oauth_connections','contact_emails'
    ])
  loop
    if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
      and tablename = tbl 
      and policyname = 'Authenticated full access'
    ) then
      execute format(
        'create policy "Authenticated full access" on %I for all to authenticated using (true) with check (true)',
        tbl
      );
    end if;
  end loop;
end;
$$;

-- ============================================
-- 22. APPOINTMENTS (Calendar)
-- ============================================
create table if not exists appointments (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text default '',
  user_id uuid references staff(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  recovery_seeker_id uuid references recovery_seekers(id) on delete set null,
  graph_event_id text unique,
  graph_calendar_id text,
  is_all_day boolean default false,
  status text default 'Scheduled',
  created_at timestamptz default now()
);

alter table appointments enable row level security;

do $$
begin
  if not exists (
      select 1 from pg_policies 
      where schemaname = 'public' 
      and tablename = 'appointments' 
      and policyname = 'Authenticated full access'
  ) then
      create policy "Authenticated full access" on appointments for all to authenticated using (true) with check (true);
  end if;
end
$$;

-- ============================================
-- 23. USER CALENDARS (Multi-calendar support)
-- ============================================
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
