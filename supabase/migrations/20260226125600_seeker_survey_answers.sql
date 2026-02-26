-- Migration: seeker_survey_answers
-- Stores per-seeker, per-survey custom question answers

CREATE TABLE IF NOT EXISTS seeker_survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seeker_id UUID NOT NULL REFERENCES recovery_seekers(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seeker_survey_unique ON seeker_survey_answers(seeker_id, survey_id);

-- RLS: allow authenticated users full access
ALTER TABLE seeker_survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage seeker_survey_answers"
  ON seeker_survey_answers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow anon insert (for public survey submissions)
CREATE POLICY "Anon can insert seeker_survey_answers"
  ON seeker_survey_answers
  FOR INSERT
  WITH CHECK (true);
