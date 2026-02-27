-- ============================================================
-- Migration: Invoice Template System
-- Creates invoice_templates and invoice_line_items tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Invoice Templates (org details + invoice branding)
CREATE TABLE IF NOT EXISTS invoice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    logo_url TEXT,
    company_name TEXT,
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    registration_number TEXT,
    accent_color TEXT DEFAULT '#6366f1',
    payment_terms TEXT,
    bank_details TEXT,
    footer_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (shared org-wide settings)
CREATE POLICY "Authenticated users can read invoice_templates"
    ON invoice_templates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert invoice_templates"
    ON invoice_templates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice_templates"
    ON invoice_templates FOR UPDATE
    TO authenticated
    USING (true);

-- 2. Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    line_total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to CRUD line items
CREATE POLICY "Authenticated users can read invoice_line_items"
    ON invoice_line_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert invoice_line_items"
    ON invoice_line_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoice_line_items"
    ON invoice_line_items FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete invoice_line_items"
    ON invoice_line_items FOR DELETE
    TO authenticated
    USING (true);

-- Index for fast lookups by invoice
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
