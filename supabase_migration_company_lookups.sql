-- ============================================================
-- Migration: Company Lookup Tables + New Columns
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Company Types lookup table
CREATE TABLE IF NOT EXISTS company_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on company_types"
    ON company_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO company_types (name, sort_order) VALUES
    ('Company', 1),
    ('University', 2),
    ('College', 3),
    ('Charity', 4),
    ('Local Authority', 5),
    ('NHS Trust', 6),
    ('Other', 7)
ON CONFLICT (name) DO NOTHING;

-- 2. Company Industries lookup table
CREATE TABLE IF NOT EXISTS company_industries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on company_industries"
    ON company_industries FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO company_industries (name, sort_order) VALUES
    ('Education', 1),
    ('Healthcare', 2),
    ('Government', 3),
    ('Non-Profit', 4),
    ('Corporate', 5),
    ('Sport', 6),
    ('Other', 7)
ON CONFLICT (name) DO NOTHING;

-- 3. Company Statuses lookup table
CREATE TABLE IF NOT EXISTS company_statuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE company_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on company_statuses"
    ON company_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO company_statuses (name, sort_order) VALUES
    ('Active', 1),
    ('Partner', 2),
    ('Inactive', 3)
ON CONFLICT (name) DO NOTHING;

-- 4. Add new columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postcode TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ator_rating INT DEFAULT 0;

-- 5. Add ATOR rating column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ator_rating INT DEFAULT 0;
