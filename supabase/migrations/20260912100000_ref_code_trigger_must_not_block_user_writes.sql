-- The referral-code trigger took down every registered-user write for four days.
--
-- ── What happened ───────────────────────────────────────────────────────────
-- 20260908b_referral_codes_are_assigned.sql ends with
--     revoke all on function public.gen_ref_code() from public, anon;
-- and installs users_assign_ref_code() as a BEFORE INSERT trigger on
-- public.users. That trigger is SECURITY INVOKER, and every client save is an
-- INSERT ... ON CONFLICT (username) DO UPDATE sent through PostgREST with the
-- anon key — so the trigger runs as anon, calls gen_ref_code(), and from
-- 2026-09-08 08:53:32 UTC failed on every non-guest row with
--     permission denied for function gen_ref_code
-- Guests skip the loop, which is why guest rows kept appearing and the outage
-- looked like a quiet week rather than a broken product.
--
-- Measured 2026-09-12 (postgres logs + public.users):
--   • 1,103 failures on 09-08 alone, 40–115 an hour every hour since
--   • last successful registered write 2026-09-08 08:53:26 — six seconds
--     before the first failure
--   • 0 registered rows created or updated in four days; 36 people completed
--     the signup form; 57 registered accounts were active and none of their
--     progress reached the cloud (it is in their browser's localStorage and
--     will sync on their next save once this is applied)
--
-- ── The fix, three layers ───────────────────────────────────────────────────
-- 1. anon may execute gen_ref_code(). It returns eight random letters and
--    reads nothing; locking it bought no security and cost the product.
-- 2. The trigger runs as its owner, so its rights no longer depend on which
--    role sent the row.
-- 3. The trigger cannot block a users write, ever. A referral code is a
--    nicety; if assigning one fails for any reason the row is saved without
--    one, and assign_personal_ref_code() can fill it in later.

grant execute on function public.gen_ref_code() to anon, authenticated, service_role;

create or replace function public.users_assign_ref_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare i int := 0;
begin
  if new.username is null or new.username like 'guest%' or new.personal_ref_code is not null then
    return new;
  end if;
  begin
    loop
      i := i + 1;
      new.personal_ref_code := public.gen_ref_code();
      exit when not exists (
        select 1 from public.users u where u.personal_ref_code = new.personal_ref_code
      ) or i >= 10;
    end loop;
  exception when others then
    -- Never let the referral nicety block a signup or a progress save.
    new.personal_ref_code := null;
  end;
  return new;
end;
$$;
