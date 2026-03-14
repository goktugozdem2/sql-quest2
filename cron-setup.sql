-- pg_cron setup for SQL Quest scheduled edge functions
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
--
-- Prerequisites:
--   1. pg_cron extension enabled (enabled by default on Supabase)
--   2. Edge functions deployed:
--        supabase functions deploy streak-reminder
--        supabase functions deploy skill-decay
--   3. Supabase project URL and anon key available

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres (required on some Supabase plans)
GRANT USAGE ON SCHEMA cron TO postgres;

-- ============================================================
-- 1. streak-reminder — daily at 6:00 PM UTC
--    Sends streak-at-risk emails to users who haven't practiced
--    today but have an active streak.
-- ============================================================
SELECT cron.schedule(
  'streak-reminder',              -- job name
  '0 18 * * *',                   -- 6:00 PM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/streak-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR_SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- 2. skill-decay — daily at 10:00 AM UTC
--    Sends skill-decay re-engagement emails to invested users
--    who haven't practiced in 5+ days and have rusty skills.
-- ============================================================
SELECT cron.schedule(
  'skill-decay',                  -- job name
  '0 10 * * *',                   -- 10:00 AM UTC daily
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/skill-decay',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <YOUR_SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- Verify scheduled jobs
-- ============================================================
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname IN ('streak-reminder', 'skill-decay')
ORDER BY jobname;

-- ============================================================
-- Useful management commands (run manually as needed)
-- ============================================================

-- View recent job execution history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Unschedule a job:
-- SELECT cron.unschedule('streak-reminder');
-- SELECT cron.unschedule('skill-decay');

-- Update schedule (e.g., change streak-reminder to 5 PM):
-- SELECT cron.unschedule('streak-reminder');
-- SELECT cron.schedule('streak-reminder', '0 17 * * *', $$ ... $$);
