-- ============================================================
-- PIPELINES FEATURE — Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create the pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tracker_type TEXT NOT NULL CHECK (tracker_type IN ('workshop', 'treatment')),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything on pipelines"
  ON pipelines FOR ALL USING (auth.role() = 'authenticated');

-- 2. Add pipeline_id columns to existing tables
ALTER TABLE workshop_stages ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE;
ALTER TABLE prevention_schedule ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;
ALTER TABLE recovery_seekers ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL;

-- 3. Seed default pipelines
INSERT INTO pipelines (id, name, tracker_type, sort_order)
VALUES ('00000000-0000-0000-0000-000000000001', 'Workshop Pipeline', 'workshop', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipelines (id, name, tracker_type, sort_order)
VALUES ('00000000-0000-0000-0000-000000000002', 'Enquiries', 'treatment', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipelines (id, name, tracker_type, sort_order)
VALUES ('00000000-0000-0000-0000-000000000003', 'Active Treatment', 'treatment', 1)
ON CONFLICT (id) DO NOTHING;

-- 4. Link existing workshop stages to the default workshop pipeline
UPDATE workshop_stages
SET pipeline_id = '00000000-0000-0000-0000-000000000001'
WHERE pipeline_id IS NULL;
