-- ─── Workshop Types Lookup Table ──────────────────────────────
-- Run this migration in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS workshop_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workshop_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users can manage workshop_types"
    ON workshop_types FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Seed with the three original hardcoded values
INSERT INTO workshop_types (name, sort_order) VALUES
    ('Awareness', 0),
    ('Prevention', 1),
    ('Training', 2);
