-- test2 gets Pro for internal testing (founder, 2026-09-19).
--
-- Plan fields are server-owned (migration 20260914100000): a client write
-- cannot grant Pro, so this is done here, as service role, with a grant
-- reason that names it. test2 is an internal account (isInternalAccount in
-- every sender; leagues.js) — it never receives campaign mail and is
-- excluded from every read, so this changes no metric.
--
-- The 09-14 cleanup (20260914_pro_without_payment.sql, section 2) flips
-- proStatus off for any non-lifetime row whose proExpiry is past + 3 days;
-- the expiry below is a year out, so a re-run of that file leaves this alone.
--
--   supabase db query --linked -f supabase/manual/20260919_test2_pro.sql

update public.users
   set data = data || jsonb_build_object(
                'proStatus', true,
                'proType', 'annual',
                'proExpiry', (now() + interval '1 year')::text,
                'proAutoRenew', false,
                'proGrantReason', 'internal_test_20260919'),
       updated_at = now()
 where username = 'test2';

-- Verify: one row, proStatus true, expiry a year out.
select username, data->>'proStatus' as pro_status, data->>'proType' as pro_type,
       data->>'proExpiry' as pro_expiry, data->>'proGrantReason' as reason
  from public.users where username = 'test2';
