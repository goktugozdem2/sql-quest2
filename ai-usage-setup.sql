-- SQL Quest: AI Usage Tracking Table
-- Run this in Supabase SQL Editor

-- Track daily AI call usage per user
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(username, date);

-- Auto-cleanup: delete records older than 90 days (optional, saves storage)
-- Run this periodically or set up a cron job
-- DELETE FROM ai_usage WHERE date < CURRENT_DATE - INTERVAL '90 days';

-- Enable RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Allow the service role (Edge Function) full access
CREATE POLICY "Service role full access" ON ai_usage
  FOR ALL USING (true);

-- Optional: Allow users to read their own usage
CREATE POLICY "Users read own usage" ON ai_usage
  FOR SELECT USING (username = current_setting('request.jwt.claims', true)::json->>'sub');

-- Atomic rate limit check-and-increment function
-- Prevents race conditions where concurrent requests could bypass the daily limit
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_username TEXT,
  p_date DATE,
  p_plan_type TEXT,
  p_daily_limit INT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
  v_limited BOOLEAN := FALSE;
BEGIN
  -- Upsert and increment atomically
  INSERT INTO ai_usage (username, date, call_count, plan_type, updated_at)
  VALUES (p_username, p_date, 1, p_plan_type, NOW())
  ON CONFLICT (username, date)
  DO UPDATE SET
    call_count = CASE
      WHEN ai_usage.call_count < p_daily_limit THEN ai_usage.call_count + 1
      ELSE ai_usage.call_count
    END,
    updated_at = NOW()
  RETURNING call_count INTO v_count;

  -- Check if the user was already at the limit (count didn't change)
  IF v_count >= p_daily_limit THEN
    -- Check if we actually incremented or were blocked
    SELECT call_count INTO v_count FROM ai_usage
    WHERE username = p_username AND date = p_date;
    IF v_count > p_daily_limit THEN
      v_limited := TRUE;
    ELSIF v_count = p_daily_limit THEN
      -- Could be the one that just hit the limit, or was already there
      -- The CASE above prevents going over, so if equal we just used the last one
      v_limited := FALSE;
    END IF;
  END IF;

  RETURN json_build_object('new_count', v_count, 'was_limited', v_limited);
END;
$$;
