-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- This adds the missing fields we integrated into the UI so the saves don't silently fail.

-- 1. Coaching Sessions (convert date to timestamp so it holds hours/mins, add end time and staff member)
ALTER TABLE coaching_sessions
  ALTER COLUMN date TYPE timestamptz USING date::timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id) ON DELETE SET NULL;

-- 2. Prevention Schedule / Workshops (add image and monetary value for the new Kanban board)
ALTER TABLE prevention_schedule
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS value numeric(12,2) DEFAULT 0;
