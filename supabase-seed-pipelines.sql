-- ============================================================
-- SEED EXISTING DATA — Run after the initial migration
-- ============================================================

-- 1. Assign existing workshops to the default Workshop Pipeline
UPDATE prevention_schedule
SET pipeline_id = '00000000-0000-0000-0000-000000000001'
WHERE pipeline_id IS NULL;

-- 2. Create stages for the "Enquiries" pipeline
INSERT INTO workshop_stages (name, label, color, sort_order, pipeline_id) VALUES
  ('New Enquiry',        'New Enquiry',        '#3b82f6', 0, '00000000-0000-0000-0000-000000000002'),
  ('Contacted',          'Contacted',          '#f59e0b', 1, '00000000-0000-0000-0000-000000000002'),
  ('Assessment Booked',  'Assessment Booked',  '#22c55e', 2, '00000000-0000-0000-0000-000000000002'),
  ('Lost',               'Lost',               '#64748b', 3, '00000000-0000-0000-0000-000000000002');

-- 3. Create stages for the "Active Treatment" pipeline
INSERT INTO workshop_stages (name, label, color, sort_order, pipeline_id) VALUES
  ('Awaiting Start',  'Awaiting Start',  '#06b6d4', 0, '00000000-0000-0000-0000-000000000003'),
  ('In Treatment',    'In Treatment',    '#22c55e', 1, '00000000-0000-0000-0000-000000000003'),
  ('On Hold',         'On Hold',         '#f59e0b', 2, '00000000-0000-0000-0000-000000000003'),
  ('Completed',       'Completed',       '#8b5cf6', 3, '00000000-0000-0000-0000-000000000003'),
  ('Dropped Out',     'Dropped Out',     '#ef4444', 4, '00000000-0000-0000-0000-000000000003');

-- 4. Assign existing recovery seekers to the correct pipeline based on their status
UPDATE recovery_seekers SET pipeline_id = '00000000-0000-0000-0000-000000000002'
WHERE status IN ('New Enquiry', 'Contacted', 'Assessment Booked', 'Lost')
  AND pipeline_id IS NULL;

UPDATE recovery_seekers SET pipeline_id = '00000000-0000-0000-0000-000000000003'
WHERE status IN ('Active', 'Awaiting Start', 'In Treatment', 'On Hold', 'Completed', 'Dropped Out')
  AND pipeline_id IS NULL;

-- 5. Any remaining seekers without a pipeline go to Enquiries
UPDATE recovery_seekers SET pipeline_id = '00000000-0000-0000-0000-000000000002'
WHERE pipeline_id IS NULL;
