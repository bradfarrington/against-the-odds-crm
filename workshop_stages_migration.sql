-- Create workshop_stages table
CREATE TABLE IF NOT EXISTS workshop_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workshop_stages ENABLE ROW LEVEL SECURITY;

-- Simple policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON workshop_stages
    FOR ALL USING (auth.role() = 'authenticated');

-- Seed initial stages
INSERT INTO workshop_stages (name, label, color, sort_order) VALUES
('Initial Conversation', 'Initial Conversation', 'var(--text-muted)', 0),
('Proposal', 'Proposal', 'var(--info)', 1),
('In Comms', 'In Comms', 'var(--warning)', 2),
('Session Booked', 'Session Booked', 'var(--primary)', 3),
('Post Session', 'Post Session', 'var(--success)', 4),
('Invoicing', 'Invoicing', '#a855f7', 5)
ON CONFLICT (name) DO NOTHING;
