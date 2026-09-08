-- Referral codes are ASSIGNED by the database, never derived from the username.
--
-- ── Why the derived scheme had to go ────────────────────────────────────────
-- `generatePersonalRefCode` (src/utils/referrals.js) was
-- `btoa(username).replace(/[=+/]/g,'').substring(0,8).toUpperCase()`. Eight
-- base64 characters carry only the first SIX BYTES of the username, so any two
-- usernames sharing a six-character prefix get the same code.
--
-- Measured against the live table 2026-09-08, over the 348 non-guest accounts:
--   • 341 distinct codes — 6 codes collide, covering 13 accounts (3.7%)
--   • 68 accounts get a code SHORTER than 8 characters
--   • real collisions: sachin2468/sachinp478, 2024t1008/2024t1177,
--     2025t0320/2025t0502
-- The rate is not random: this user base clusters on prefixes like `2024t…`,
-- so it grows with every cohort.
--
-- A collision is not cosmetic. `claim-referral-reward` grants Pro days
-- server-side off these stats, so two users sharing a code means one of them
-- receives the other's referrals AND the other's Pro days. The unique index
-- from 20260908_referral_personal_codes.sql prevents the mis-grant, but at the
-- price of silently denying a code to whichever of the 13 came second.
--
-- ── The scheme ──────────────────────────────────────────────────────────────
-- Random 8 characters from a 32-symbol alphabet with 0/O/1/I removed, so a
-- code read aloud or retyped from a screenshot is unambiguous. 32^8 ≈ 1.1e12;
-- uniqueness is enforced by the index and retried here, not hoped for.
--
-- Codes now exist server-side for everyone, which also removes the client's
-- job of persisting one — it never did (0 of 348 accounts carried
-- `data->>'personalRefCode'`, because loadUserSession stamped it AFTER its
-- only saveUserData call).

-- ── The generator ───────────────────────────────────────────────────────────
create or replace function public.gen_ref_code()
returns text
language sql
volatile
as $$
  select string_agg(
           substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                  1 + floor(random() * 32)::int, 1), '')
    from generate_series(1, 8);
$$;

-- ── Assign on demand, idempotent ────────────────────────────────────────────
-- Returns the existing code when there is one, so it is safe to call on every
-- login. Guests never get a code — they cannot be a referrer.
create or replace function public.assign_personal_ref_code(p_username text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_code     text;
  i          int := 0;
begin
  if p_username is null or p_username like 'guest%' then
    return null;
  end if;

  select personal_ref_code into v_existing
    from public.users where username = p_username;
  if v_existing is not null then
    return v_existing;
  end if;

  loop
    i := i + 1;
    v_code := public.gen_ref_code();
    begin
      update public.users
         set personal_ref_code = v_code
       where username = p_username;
      return v_code;
    exception when unique_violation then
      if i >= 10 then
        raise exception 'could not assign a unique referral code for %', p_username;
      end if;
    end;
  end loop;
end;
$$;

-- ── New accounts get one at insert ──────────────────────────────────────────
create or replace function public.users_assign_ref_code()
returns trigger
language plpgsql
as $$
declare i int := 0;
begin
  if new.username is null or new.username like 'guest%' or new.personal_ref_code is not null then
    return new;
  end if;
  -- Pick a code that is not already taken. The index is the real guarantee;
  -- this only avoids a failed INSERT on an astronomically unlikely draw.
  loop
    i := i + 1;
    new.personal_ref_code := public.gen_ref_code();
    exit when not exists (
      select 1 from public.users u where u.personal_ref_code = new.personal_ref_code
    ) or i >= 10;
  end loop;
  return new;
end;
$$;

drop trigger if exists users_assign_ref_code_trg on public.users;
create trigger users_assign_ref_code_trg
  before insert on public.users
  for each row execute function public.users_assign_ref_code();

-- ── Backfill every existing account ─────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select username from public.users
     where personal_ref_code is null
       and username not like 'guest%'
  loop
    perform public.assign_personal_ref_code(r.username);
  end loop;
end
$$;

revoke all on function public.assign_personal_ref_code(text) from public, anon;
revoke all on function public.gen_ref_code() from public, anon;
grant execute on function public.assign_personal_ref_code(text) to service_role;
