-- Session tokens: preparing the cut — the password-less named rows (2026-09-25).
--
-- Plan: docs/plans/account-session-tokens-2026-09-22.md (Status). Steps 1–2
-- are live; 20260924100000 closed four gaps and left one residual, which this
-- migration closes. ADDITIVE: nothing a real client does today starts failing.
--
-- The residual. sq_username_registered (20260913130000) answered "is this
-- name taken" by "does a row with a PASSWORD exist". Three named rows in
-- production have no password (read 2026-09-23): brallie (13 solves),
-- mike_sql (9) and saida240690 (16, has an email). They read as free, so a
-- new registrant could pick one of those names, and sq_save_user — which on
-- an existing row with no password takes the password the request carries —
-- would hand them that row, with someone else's progress on it.
--
-- 1. sq_username_registered: a row exists = the name is taken, for every
--    non-guest name. A guest_* row keeps the old meaning (taken only if it
--    somehow has a password): the client reserves guest_* before it asks, and
--    naming guest rows here would only turn the function into an oracle for
--    which guest ids exist.
--
--    Every caller, and what it expects (read 2026-09-25):
--      * src/app.jsx isUsernameRegistered — the only client wrapper; returns
--        r === true. Its 404 fallback (a server without the function) reads
--        the table directly and is not reached in production.
--      * src/app.jsx handleLogin, authMode 'register' (the auth screen's
--        sign-up form): "is this name free for a NEW account?" — refuses
--        guest_* first, then asks; true → "Username already exists".
--      * src/app.jsx guest signup prompt (convertGuestToUser's form): the
--        same question — refuses guest_* first; true → "Username already taken".
--      * No edge function calls it (supabase/functions/*: none), and no SQL
--        function does. Both callers want "a row exists", so the meaning is
--        changed in place rather than beside a second function.
--
-- 2. sq_save_user refuses (28000, "password refused: this username belongs
--    to an existing account") to set a password on an EXISTING non-guest row
--    that has none, unless the save carries a valid session token for that
--    row. No password-less row has ever minted one (account-login needs the
--    stored hash), so in practice a password never lands on such a row from a
--    client again; the owner of saida240690 can still set one through the
--    email reset (sq_set_password_for_session_email, authenticated session).
--    A password-less row's own saves that carry NO password keep working, as
--    do guest rows (a guest row never takes a password in any flow).
--    The body is 20260924100000's byte for byte plus one block marked
--    "session tokens (2026-09-25)"; same eight-argument signature, so no drop
--    and no second overload. tests/account-access.test.js strips the block
--    and compares.
--
-- The check is called with p_claim false and after the step-1 PERFORM, so it
-- adds no miss row the PERFORM did not (one per username per hour). A raise
-- rolls back the whole call, the step-1 miss row included.
--
-- Apply: supabase db query --linked -f supabase/migrations/20260925100000_session_token_cut_prep.sql
-- Roll back: supabase/manual/20260925_session_token_cut_prep_rollback.sql
-- Local proof: supabase/manual/account-session-tokens-replica-test.sql (section "cut prep")

begin;

-- ── 1. a row exists = the name is taken ──
create or replace function public.sq_username_registered(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.username = lower(trim(p_username))
      and (u.username not like 'guest\_%'
           or coalesce(nullif(u.password_hash, ''), nullif(u.data->>'passwordHash', '')) is not null)
  );
$$;

revoke all on function public.sq_username_registered(text) from public;
grant execute on function public.sq_username_registered(text) to anon, authenticated;

-- ── 2. a password never lands on a password-less named row ──
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

  -- ── session tokens (2026-09-25): a password never lands on a password-less named row ──
  -- sq_username_registered used to call such a row free, so a registrant
  -- could take the name and this save would write their password onto a row
  -- holding someone else's progress. A session token for the row is the only
  -- proof accepted — and a row without a password has never minted one.
  if p_username not like 'guest\_%'
     and coalesce(nullif(o.password_hash, ''), nullif(o.data->>'passwordHash', '')) is null
     and coalesce(nullif(p_password_hash, ''), nullif(p_data->>'passwordHash', '')) is not null then
    if public.sq_session_token_check(p_username, p_token, false) <> 'ok' then
      raise exception 'password refused: this username belongs to an existing account'
        using errcode = '28000',
              hint = 'sq_save_user never sets a password on an existing named row without that row''s session token';
    end if;
  end if;
  -- ── end session tokens (2026-09-25) ──

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

commit;

notify pgrst, 'reload schema';
