-- Reschedule streak-reminder: daily 18:00 UTC -> hourly (2026-07-17).
-- The function now gates sends on the USER's local 18:xx (timezone read
-- from activation-event tz stamps), so the cron must tick every hour.
-- 18:00 UTC was 11:00 in California and 23:30 in India — the reminder
-- either arrived mid-workday or after the streak was already dead.
-- Idempotent: unschedule if present, then schedule.
do $mig$
begin
  if exists (select 1 from cron.job where jobname = 'streak-reminder') then
    perform cron.unschedule('streak-reminder');
  end if;
end $mig$;

select cron.schedule(
  'streak-reminder',
  '0 * * * *',
  $cmd$
  select net.http_post(
    url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/streak-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4'
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
