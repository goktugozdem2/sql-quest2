-- Session tokens, step 4: THE CUT. NOT A MIGRATION — applied by hand, and only
-- on the founder's explicit go (approved in principle 2026-09-22, "Oturum
-- anahtarı: onayla, bu hafta"; the go for THIS file is a separate message).
--
-- Plan: docs/plans/account-session-tokens-2026-09-22.md (Status, release note
-- 2026-09-25). Preconditions, in order:
--   1. supabase/migrations/20260925100000_session_token_cut_prep.sql applied
--      (this file's sq_save_user is that body with the cut in it);
--   2. the client that handles "session token required" live for at least a
--      few days (it signs the person in again and keeps their local progress;
--      an older client would read the refusal as "account gone" and drop the
--      local copy — the release order is the whole defence);
--   3. session_token_misses read: missing-token users per day near zero, and
--      at least 7 days since 2026-09-22.
--
-- What changes. On an EXISTING row, with a missing or wrong token:
--   * sq_load_account RAISES 28000 "session token required" (it does not
--     return an empty set: empty means "no such account", and the client
--     deletes the local copy of an account the cloud says does not exist);
--   * sq_save_user RAISES the same;
--   * a carried plan (p_carry_pro_from) needs the guest's own secret —
--     missing or wrong carries nothing; a paid guest row with no stored secret
--     is claimed by the secret the carry presents (the same trust on first use
--     as its own saves).
-- What does not change:
--   * a NEW row needs no token — registration creates the row before
--     account-login mints the token; a new guest's first save stores its
--     secret (trust on first use);
--   * a guest row with no stored secret is claimed by the first save that
--     carries one (as today) — a save without one is refused;
--   * the service role (JWT role service_role) and a direct database session
--     are never refused (sq_session_trusted_caller);
--   * the regression guard, the server-owned fields, the 20260925 password
--     rule, a username with no row (read answers empty, as before).
--
-- Errcode 28000 (PostgREST answers 403); the client matches the MESSAGE text
-- "session token required" (src/utils/session-token.js isSessionTokenRequired),
-- not the status. A raise rolls back the call, so a refused call leaves no
-- session_token_misses row: from the cut on, count refusals with the client
-- event session_token_refused and the postgres error log, not that table.
--
-- Apply:     supabase db query --linked -f supabase/manual/20260925b_session_token_cut.sql
-- Roll back: supabase db query --linked -f supabase/manual/20260925b_session_token_cut_rollback.sql
-- Local proof: supabase/manual/account-session-tokens-replica-test.sql (section "the cut")

begin;

-- ── who is never refused ──
create or replace function public.sq_session_trusted_caller()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  -- PostgREST sets request.jwt.claims on every request (role anon,
  -- authenticated or service_role) and connects as authenticator. A direct
  -- database session (the SQL editor, `supabase db query`) has no claims and
  -- is not authenticator.
  select case
    when coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
                  nullif(current_setting('request.jwt.claim.role', true), '')) is not null
      then coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
                    nullif(current_setting('request.jwt.claim.role', true), '')) = 'service_role'
    else session_user::text not in ('authenticator', 'anon', 'authenticated')
  end;
$function$;

revoke all on function public.sq_session_trusted_caller() from public;
revoke all on function public.sq_session_trusted_caller() from anon, authenticated;

-- ── the read ──
create or replace function public.sq_load_account(p_username text, p_token text default null)
returns table (username text, data jsonb)
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
begin
  -- ── session token cut (step 4): an existing row is read only with its token ──
  -- Raises rather than returning nothing: an empty answer means "no such
  -- account", and the client deletes its local copy of an account the cloud
  -- says does not exist (loadUserData). A read never claims a guest row, so
  -- an unclaimed guest row is not readable until its owner's first save.
  -- A username with no row still answers empty, as before.
  if exists (select 1 from public.users u where u.username = p_username)
     and not public.sq_session_trusted_caller() then
    if public.sq_session_token_check(p_username, p_token, false) <> 'ok' then
      raise exception 'session token required'
        using errcode = '28000',
              hint = 'sign in again: this account''s rows are read and written only with its session token';
    end if;
  end if;
  -- ── end session token cut ──
  return query
    select v.username, v.data
      from public.users_public v
     where v.username = p_username
     limit 1;
end;
$function$;

revoke all on function public.sq_load_account(text, text) from public;
grant execute on function public.sq_load_account(text, text) to anon, authenticated, service_role;

-- ── the save ──
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
  v_tok text; -- session token cut (step 4)
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
        -- session token cut (step 4): only the guest's own secret carries the
        -- plan. A guest with no stored secret is claimed by it (the same trust
        -- on first use as its saves); no secret, or a wrong one, carries nothing.
        v_carry := public.sq_session_token_check(p_carry_pro_from, p_carry_token, true);
        if v_carry not in ('ok', 'claimed') then
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

  -- ── session token cut (step 4): an existing row needs its token ──
  -- 'ok' (the account's session, or the guest's own secret) or 'claimed' (a
  -- guest row with no stored secret takes the first secret a save presents —
  -- trust on first use, founder 2026-09-22). 'missing', 'invalid' and an
  -- unclaimed guest saved without a secret are refused. The service role
  -- (and a direct database session) is never refused.
  if not public.sq_session_trusted_caller() then
    v_tok := public.sq_session_token_check(p_username, p_token, true);
    if v_tok not in ('ok', 'claimed') then
      raise exception 'session token required'
        using errcode = '28000',
              hint = 'sign in again: this account''s rows are read and written only with its session token';
    end if;
  end if;
  -- ── end session token cut ──

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
