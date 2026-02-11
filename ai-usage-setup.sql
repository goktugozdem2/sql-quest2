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
