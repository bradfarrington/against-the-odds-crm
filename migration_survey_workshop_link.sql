-- Add workshop_id and facilitator_id to survey_responses
-- so that each survey submission can be linked to a specific workshop and staff member

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS workshop_id UUID REFERENCES prevention_schedule(id) ON DELETE SET NULL;

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS facilitator_id UUID REFERENCES staff(id) ON DELETE SET NULL;
