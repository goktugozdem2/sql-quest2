-- The email senders refuse anything but the service role (2026-09-17).
--
-- Found after the first ten goal-note sends: every sender answered the ANON
-- key — the one that ships in every browser — with 200, dry run and send
-- alike. checkout-abandon, skill-decay, streak-reminder, weekly-digest and
-- welcome-back were even being *called* by pg_cron with the anon key.
-- capture-email-drip already reads the service role from Vault; that is the
-- pattern every job gets here.
--
-- ORDER MATTERS. Run this file FIRST, then deploy the gated functions:
--
--   supabase db query --linked -f supabase/manual/20260917_cron_service_role.sql
--   supabase functions deploy checkout-abandon skill-decay streak-reminder \
--       weekly-digest welcome-back activated-note lapsed-pro
--
-- Deploying first would make five cron jobs 401 until this runs. The
-- schedules below are the live ones (cron.job, read 2026-09-17); the vault
-- secret `service_role_key` already exists (capture-email-drip uses it).
-- goal-note and prep-plan-note are already gated and deployed; nothing
-- schedules them.

do $$
declare
  j record;
begin
  for j in
    select * from (values
      ('checkout-abandon',   'checkout-abandon',  '0 15 * * *'),
      ('skill-decay',        'skill-decay',       '0 10 * * *'),
      ('streak-reminder',    'streak-reminder',   '0 * * * *'),
      ('weekly-digest',      'weekly-digest',     '0 9 * * 1'),
      ('welcome-back-daily', 'welcome-back',      '0 10 * * *')
    ) as t(jobname, fn, schedule)
  loop
    -- Schedules verified against cron.job on 2026-09-17 (all five match).
    perform cron.unschedule(j.jobname);
    perform cron.schedule(
      j.jobname,
      j.schedule,
      format($cmd$
        select net.http_post(
          url := 'https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/%s',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
          )
        );
      $cmd$, j.fn)
    );
  end loop;
end $$;

-- Verify: every job now reads the key from Vault and none carries a literal.
select jobname, schedule,
       position('vault.decrypted_secrets' in command) > 0 as uses_vault,
       position('Bearer eyJ' in command) > 0            as literal_key
  from cron.job order by jobname;
