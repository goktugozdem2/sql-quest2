-- Tutor Instrumentation Events
-- Phase 1: minimal schema (user_id, challenge_id, timestamp)
-- Phase 2 adds: intervention_type, trigger, failed_attempts, time_on_problem_ms, session_id, ai_model_version, resulted_in_correct_answer

CREATE TABLE IF NOT EXISTS tutor_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  challenge_id TEXT,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by user and time
CREATE INDEX IF NOT EXISTS idx_tutor_events_username ON tutor_events (username, created_at DESC);

-- Index for querying by challenge
CREATE INDEX IF NOT EXISTS idx_tutor_events_challenge ON tutor_events (challenge_id) WHERE challenge_id IS NOT NULL;

-- RLS: only service role can insert (edge function uses service key)
ALTER TABLE tutor_events ENABLE ROW LEVEL SECURITY;

-- No public policies = anon key cannot read or write.
-- The ai-tutor edge function uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
