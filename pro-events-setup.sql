-- Pro modal analytics events
CREATE TABLE IF NOT EXISTS pro_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  username TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by date range
CREATE INDEX idx_pro_events_created ON pro_events(created_at);

-- Enable RLS
ALTER TABLE pro_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (fire-and-forget from frontend)
CREATE POLICY "Allow anonymous inserts" ON pro_events
  FOR INSERT TO anon WITH CHECK (true);

-- Allow service role to read all
CREATE POLICY "Service role reads all" ON pro_events
  FOR SELECT TO service_role USING (true);

-- Auto-cleanup: delete events older than 90 days
-- Run via pg_cron or manual cleanup
