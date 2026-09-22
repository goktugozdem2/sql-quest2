-- Session tokens: the gaps before the cut (2026-09-24).
--
-- Plan: docs/plans/account-session-tokens-2026-09-22.md. Steps 1–2 went live
-- on 2026-09-22 (20260923100000: account_sessions, guest_secrets,
-- session_token_misses; token-aware sq_load_account / sq_save_user that
-- record a missing or wrong token and refuse nothing). The build review found
-- four holes that step 4 — the cut that makes those functions refuse a
-- missing or invalid token — would either open or leave open. Gap 1 (the
-- register form's "username taken" check read through sq_load_account with no
-- token) is a client-only fix; this migration closes the other three.
--
-- ADDITIVE, like step 1. Nothing that works today starts failing:
--
--   2. p_carry_pro_from copied Pro onto a new account from ANY paid guest_*
--      row, on the name alone. sq_save_user gains a trailing
--      p_carry_token text default null — the guest's own secret, the one its
--      saves already carry as p_token — checked against guest_secrets through
--      the same sq_session_token_check (p_claim false: a carry never claims):
--        'ok'        the secret matches            → carried;
--        'unclaimed' the guest has no stored secret → carried as today, and a
--                    'missing' miss is recorded against the GUEST name;
--        'missing'   no p_carry_token was sent      → carried as today, the
--                    check records the 'missing' miss itself;
--        'invalid'   a secret that does not match   → NOT carried (recorded).
--      A null token still carries on purpose: an open tab running the client
--      from before this release sends no p_carry_token, and the person behind
--      it may be a guest who has just paid. Refusing it now would take a paid
--      plan from its owner — step-1 rule, recorded, never refused. The cut
--      turns 'missing' into no carry exactly as it turns it into a refusal
--      elsewhere. Only a wrong secret is refused today: nobody holding the
--      real one sends a different one.
--      The check runs only when the named guest row exists and is paid, so
--      the misses table cannot be filled by naming invented guests.
--
--   3. Email password reset (sq_set_password_for_session_email, the only
--      reset path: account-password already ends sessions on a change made
--      with the old password) now deletes the account's account_sessions rows
--      in the same statement that writes the new hash. A reset is what
--      someone does when they think another person has the password; every
--      token minted with the old one must stop working then, not at the cut.
--      The reset browser holds no token (the flow ends at "You can now log
--      in"), so nobody is signed out who did not ask to be.
--
--   4. Logout cleared the token only in the browser; the account_sessions row
--      lived until a password change. sq_end_session(p_username, p_token)
--      deletes the ONE row matching both the username and sha256(p_token).
--      anon may call it: without the token it matches nothing, and it returns
--      nothing, so it is not an oracle for which tokens exist. No edge
--      function deploy is needed.
--
-- sq_save_user is DROPPED and recreated with the one new defaulted parameter,
-- so exactly one function has the name (PostgREST answers 300 when two
-- overloads both match a call). An old client that sends no p_carry_token
-- resolves to the same function. The body is 20260923100000's byte for byte
-- plus two insertions marked "session tokens (2026-09-24)"; the regression
-- guard and the server-owned keys are untouched. tests/account-access.test.js
-- strips the insertions and compares.
--
-- Apply: supabase db query --linked -f supabase/migrations/20260924100000_session_token_gaps.sql
-- Roll back: supabase/manual/20260924_session_token_gaps_rollback.sql
-- Local proof: supabase/manual/account-session-tokens-replica-test.sql

begin;

-- ── gap 2: the carried plan proves the guest ──
drop function if exists public.sq_save_user(text, jsonb, text, text, text, text, text);

create or replace function public.sq_save_user(
  p_username text,
  p_data jsonb,
  p_password_hash text default ''::text,
  p_salt text default ''::text,
  p_email text default null::text,
  p_carry_pro_from text default null::text,
  p_token text default null::text,
  p_carry_token text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  o public.users%rowtype;
  g public.users%rowtype;
  v_carry text; -- session tokens (2026-09-24)
  v_hash text;
  v_salt text;
  v_email text;
  v_data jsonb;
  v_keep jsonb;
  k text;
  old_solved int;
  new_solved int;
  old_xp numeric;
  new_xp numeric;
  server_keys constant text[] := array[
    'unsubToken', 'stripeCustomerId', 'stripeSessionId',
    'proStatus', 'proType', 'proExpiry', 'proAutoRenew', 'proGrantReason',
    'emailOptOut', 'trialReminder_2days_sent_at', 'trialReminder_1day_sent_at',
    'checkoutAbandonEmailAt', 'lastSkillDecayEmail', 'lastWelcomeBackEmail'
  ];
  plan_keys constant text[] := array[
    'proStatus', 'proType', 'proExpiry', 'proAutoRenew', 'proGrantReason',
    'stripeCustomerId', 'stripeSessionId'
  ];
begin
  if p_username is null or length(p_username) = 0 or length(p_username) > 64 then
    raise exception 'invalid username' using errcode = '22023';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid data' using errcode = '22023';
  end if;

  -- ── new row ──
  if not exists (select 1 from public.users where username = p_username) then
    v_data := p_data;
    foreach k in array server_keys loop
      v_data := v_data - k;
    end loop;
    v_data := v_data || jsonb_build_object('proStatus', false, 'proType', null, 'proExpiry', null, 'proAutoRenew', false);

    if p_carry_pro_from is not null and p_carry_pro_from like 'guest\_%' then
      select * into g from public.users where username = p_carry_pro_from;
      -- ── session tokens (2026-09-24): the carried plan proves the guest ──
      -- Only a paid guest row is checked (the misses table cannot be filled
      -- by naming invented guests). A wrong secret empties g, so the copy
      -- below finds nothing; FOUND stays true through this block (the only
      -- statement that sets it is the miss insert, and it sets it true).
      if found and jsonb_typeof(g.data) = 'object' and coalesce(g.data->>'proStatus', '') = 'true' then
        v_carry := public.sq_session_token_check(p_carry_pro_from, p_carry_token, false);
        if v_carry = 'unclaimed' and not exists (
          select 1 from public.session_token_misses m
           where m.username = p_carry_pro_from and m.at > now() - interval '1 hour'
        ) then
          insert into public.session_token_misses (username, kind) values (p_carry_pro_from, 'missing');
        end if;
        if v_carry = 'invalid' then
          g := null;
        end if;
      end if;
      -- ── end session tokens (2026-09-24) ──
      if found and jsonb_typeof(g.data) = 'object' and coalesce(g.data->>'proStatus', '') = 'true' then
        foreach k in array plan_keys loop
          if g.data ? k then
            v_data := v_data || jsonb_build_object(k, g.data->k);
          end if;
        end loop;
      end if;
    end if;

    insert into public.users (username, password_hash, salt, email, data, updated_at)
    values (
      p_username,
      coalesce(nullif(p_password_hash, ''), p_data->>'passwordHash', ''),
      coalesce(nullif(p_salt, ''), p_data->>'salt', ''),
      nullif(lower(coalesce(nullif(p_email, ''), p_data->>'email', '')), ''),
      v_data,
      now()
    )
    on conflict (username) do nothing;
    if found then
      -- ── session tokens (2026-09-23): a new guest row takes its secret now ──
      if p_username like 'guest\_%' and coalesce(length(p_token), 0) between 1 and 256 then
        insert into public.guest_secrets (username, secret_hash)
        values (p_username, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))
        on conflict (username) do nothing;
      end if;
      return;
    end if;
    -- lost a race with another insert: fall through to the update path
  end if;

  -- ── existing row ──
  select * into o from public.users where username = p_username for update;

  -- ── session tokens (2026-09-23, step 1: recorded, never refused) ──
  perform public.sq_session_token_check(p_username, p_token, true);

  -- ── the regression guard (2026-09-22) ──
  old_solved := case when jsonb_typeof(o.data -> 'solvedChallenges') = 'array'
                     then jsonb_array_length(o.data -> 'solvedChallenges') else 0 end;
  new_solved := case when jsonb_typeof(p_data -> 'solvedChallenges') = 'array'
                     then jsonb_array_length(p_data -> 'solvedChallenges') else 0 end;
  old_xp := case when jsonb_typeof(o.data -> 'xp') = 'number' then (o.data ->> 'xp')::numeric else 0 end;
  new_xp := case when jsonb_typeof(p_data -> 'xp') = 'number' then (p_data ->> 'xp')::numeric else 0 end;
  if (old_solved >= 3 and new_solved < old_solved * 0.8)
     or (old_xp >= 100 and new_xp < old_xp * 0.8) then
    raise exception 'regression refused: solved % -> %, xp % -> %', old_solved, new_solved, old_xp, new_xp
      using errcode = 'P0001',
            hint = 'sq_save_user refuses a save that drops solved challenges or XP by more than 20%';
  end if;

  if coalesce(nullif(o.password_hash, ''), nullif(o.data->>'passwordHash', '')) is not null then
    v_hash := coalesce(nullif(o.password_hash, ''), o.data->>'passwordHash');
    v_salt := coalesce(nullif(o.salt, ''), o.data->>'salt', '');
  else
    v_hash := coalesce(nullif(p_password_hash, ''), nullif(p_data->>'passwordHash', ''), '');
    v_salt := coalesce(nullif(p_salt, ''), nullif(p_data->>'salt', ''), '');
  end if;

  v_email := coalesce(
    nullif(o.email, ''),
    nullif(o.data->>'email', ''),
    nullif(lower(p_email), ''),
    nullif(lower(p_data->>'email'), '')
  );

  v_data := p_data - 'passwordHash' - 'salt' - 'email';
  if v_hash <> '' then
    v_data := v_data || jsonb_build_object('passwordHash', v_hash, 'salt', v_salt);
  end if;
  if v_email is not null then
    v_data := v_data || jsonb_build_object('email', v_email);
  end if;

  -- Server-set keys: always the row's value; a key the row does not have is
  -- dropped from the request rather than accepted.
  foreach k in array server_keys loop
    v_data := v_data - k;
    v_keep := case when jsonb_typeof(o.data) = 'object' then o.data->k end;
    if v_keep is not null then
      v_data := v_data || jsonb_build_object(k, v_keep);
    end if;
  end loop;

  update public.users
     set password_hash = v_hash,
         salt = v_salt,
         email = v_email,
         data = v_data,
         updated_at = now()
   where username = p_username;
end;
$function$;

revoke all on function public.sq_save_user(text, jsonb, text, text, text, text, text, text) from public;
grant execute on function public.sq_save_user(text, jsonb, text, text, text, text, text, text) to anon, authenticated, service_role;

-- ── gap 3: an email reset ends the account's sessions ──
-- Same signature, same body as 20260913130000 plus the `ended` step: a
-- data-modifying CTE runs to completion whether or not the outer query reads
-- it, and it sees exactly the usernames whose hash was just replaced. Grants
-- are restated as 20260914090000 left them (authenticated only; not anon).
create or replace function public.sq_set_password_for_session_email(p_salt text, p_hash text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(nullif(auth.jwt()->>'email', ''));
  v_username text;
begin
  if v_email is null then
    raise exception 'no session email' using errcode = '28000';
  end if;
  if p_hash !~ '^[0-9a-f]{64}$' or p_salt is null or length(p_salt) < 8 or length(p_salt) > 128 then
    raise exception 'invalid hash' using errcode = '22023';
  end if;
  with changed as (
    update public.users u
       set password_hash = p_hash,
           salt = p_salt,
           data = case when jsonb_typeof(u.data) = 'object'
                       then u.data || jsonb_build_object('passwordHash', p_hash, 'salt', p_salt)
                       else jsonb_build_object('passwordHash', p_hash, 'salt', p_salt) end,
           updated_at = now()
     where lower(coalesce(nullif(u.email, ''), u.data->>'email')) = v_email
    returning u.username
  ),
  -- session tokens (2026-09-24): every token minted with the old password ends here
  ended as (
    delete from public.account_sessions s
     using changed c
     where s.username = c.username
    returning s.token_hash
  )
  select min(username) into v_username from changed;
  return v_username;
end;
$$;

revoke all on function public.sq_set_password_for_session_email(text, text) from public;
revoke execute on function public.sq_set_password_for_session_email(text, text) from anon;
grant execute on function public.sq_set_password_for_session_email(text, text) to authenticated;

-- ── gap 4: logout ends the server row ──
create or replace function public.sq_end_session(p_username text, p_token text)
returns void
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
begin
  if p_username is null or length(p_username) = 0 or length(p_username) > 64
     or p_token is null or length(p_token) = 0 or length(p_token) > 256 then
    return;
  end if;
  delete from public.account_sessions s
   where s.username = p_username
     and s.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
end;
$function$;

revoke all on function public.sq_end_session(text, text) from public;
grant execute on function public.sq_end_session(text, text) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
