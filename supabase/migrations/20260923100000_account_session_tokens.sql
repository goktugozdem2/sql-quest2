-- Account session tokens, step 1 of 4: recorded, never refused (2026-09-23).
--
-- Plan: docs/plans/account-session-tokens-2026-09-22.md, approved by the
-- founder on 2026-09-22 ("Oturum anahtarı: onayla, bu hafta"), guests in scope.
--
-- Until now every account read (sq_load_account) and write (sq_save_user) was
-- keyed by username alone, sent with the anon key every browser holds. Anyone
-- who knew a username could read that row and overwrite its progress. The
-- regression guard (20260922160000) stops a wipe, not an edit.
--
-- This migration is ADDITIVE. Nothing that works today starts failing:
--   * public.account_sessions — sha256 hex of a session token per signed-in
--     browser. Minted ONLY by the account-login / account-password edge
--     functions (service role) after a correct password. There is no SQL
--     function that mints one, and anon/authenticated have no access to the
--     table, so the anon key cannot create a token for an account it does
--     not already hold the password to.
--   * public.guest_secrets — sha256 hex of the guest's own 32-byte secret,
--     minted in the browser at startGuestMode. Trust on first use, as decided:
--     a new guest row takes the secret its first save carries; one of the
--     6,833 existing guest rows takes the first secret any save presents.
--     The exposure (a stranger claiming an idle guest row first) costs the
--     owner only the CLOUD copy — guests are local-first.
--   * public.session_token_misses — one row per username per hour at most,
--     kind 'missing' (no token sent) or 'invalid' (a token that does not
--     match). Step 3 watches these fall; step 4 turns them into refusals.
--   * sq_load_account(p_username, p_token default null) and
--     sq_save_user(…, p_token default null): the old signatures are DROPPED
--     and recreated with one extra trailing defaulted parameter, so there is
--     exactly one function per name (PostgREST cannot choose between two
--     overloads that both match a call without p_token — it answers 300).
--     A client that sends no p_token resolves to the same function and gets
--     today's behaviour, byte for byte, plus one 'missing' miss row an hour.
--
-- The sq_save_user body is 20260922160000's, unchanged — server-owned fields,
-- the regression guard, the carry-Pro rule — with two insertions marked
-- "session tokens (2026-09-23)". tests/account-access.test.js pins that.
--
-- Hashing uses core sha256() (PostgreSQL 11+; production is 17.6), not
-- pgcrypto: pgcrypto lives in the `extensions` schema on Supabase and these
-- functions pin search_path to public, so a core function avoids the trap.
-- The edge functions hash the same way: hex SHA-256 of the UTF-8 token.
--
-- A token is only checked against a row that EXISTS. A read of a missing
-- username records nothing, so the misses table cannot be filled by probing
-- invented names; a save that creates a row has nothing to protect yet.
--
-- Apply: supabase db query --linked -f supabase/migrations/20260923100000_account_session_tokens.sql
-- Roll back: supabase/manual/20260923_account_session_tokens_rollback.sql

begin;

-- ── tables ──
create table if not exists public.account_sessions (
  username      text not null,
  token_hash    text not null,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz not null default now(),
  primary key (token_hash)
);
create index if not exists account_sessions_username_idx on public.account_sessions (username);
alter table public.account_sessions enable row level security;
revoke all on public.account_sessions from anon, authenticated;

create table if not exists public.guest_secrets (
  username     text primary key,
  secret_hash  text not null,
  created_at   timestamptz not null default now()
);
alter table public.guest_secrets enable row level security;
revoke all on public.guest_secrets from anon, authenticated;

create table if not exists public.session_token_misses (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  username  text not null,
  kind      text not null check (kind in ('missing', 'invalid'))
);
create index if not exists session_token_misses_username_at_idx on public.session_token_misses (username, at desc);
alter table public.session_token_misses enable row level security;
revoke all on public.session_token_misses from anon, authenticated;
revoke all on sequence public.session_token_misses_id_seq from anon, authenticated;

-- ── the check ──
-- Returns 'ok' (matches), 'claimed' (a guest row took this secret now),
-- 'unclaimed' (a guest row with no secret yet, on a read — not a miss),
-- 'missing' or 'invalid'. The last two are written to session_token_misses,
-- at most one row per username per hour. Step 1 never refuses on any value;
-- the callers PERFORM it and carry on.
-- last_used_at moves at most every ten minutes: every debounced save would
-- otherwise rewrite the session row.
-- Not callable by anon or authenticated: it would be a token oracle and a
-- guest-claiming door of its own.
create or replace function public.sq_session_token_check(p_username text, p_token text, p_claim boolean)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hash text;
  v_kind text;
begin
  if p_token is null or length(p_token) = 0 then
    v_kind := 'missing';
  elsif length(p_token) > 256 then
    v_kind := 'invalid';
  else
    v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
    if p_username like 'guest\_%' then
      if exists (select 1 from public.guest_secrets s where s.username = p_username and s.secret_hash = v_hash) then
        return 'ok';
      end if;
      if not exists (select 1 from public.guest_secrets s where s.username = p_username) then
        if not p_claim then
          return 'unclaimed';
        end if;
        -- trust on first use (founder, 2026-09-22)
        insert into public.guest_secrets (username, secret_hash) values (p_username, v_hash)
        on conflict (username) do nothing;
        if found then
          return 'claimed';
        end if;
        -- lost a race with another first save: fall through to the re-check
        if exists (select 1 from public.guest_secrets s where s.username = p_username and s.secret_hash = v_hash) then
          return 'ok';
        end if;
      end if;
      v_kind := 'invalid';
    else
      update public.account_sessions s
         set last_used_at = now()
       where s.token_hash = v_hash and s.username = p_username
         and s.last_used_at < now() - interval '10 minutes';
      if found or exists (select 1 from public.account_sessions s where s.token_hash = v_hash and s.username = p_username) then
        return 'ok';
      end if;
      v_kind := 'invalid';
    end if;
  end if;

  if not exists (
    select 1 from public.session_token_misses m
     where m.username = p_username and m.at > now() - interval '1 hour'
  ) then
    insert into public.session_token_misses (username, kind) values (p_username, v_kind);
  end if;
  return v_kind;
end;
$function$;

revoke all on function public.sq_session_token_check(text, text, boolean) from public;
revoke all on function public.sq_session_token_check(text, text, boolean) from anon, authenticated;

-- ── one account row, now token-aware ──
-- Was `language sql stable`; the check writes (a miss row, last_used_at), so
-- it is plpgsql and volatile. The client already calls it with POST, which
-- PostgREST runs read-write. Same columns, same one-row answer.
drop function if exists public.sq_load_account(text);

create or replace function public.sq_load_account(p_username text, p_token text default null)
returns table (username text, data jsonb)
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
begin
  if exists (select 1 from public.users u where u.username = p_username) then
    perform public.sq_session_token_check(p_username, p_token, false);
  end if;
  return query
    select v.username, v.data
      from public.users_public v
     where v.username = p_username
     limit 1;
end;
$function$;

revoke all on function public.sq_load_account(text, text) from public;
grant execute on function public.sq_load_account(text, text) to anon, authenticated, service_role;

-- ── the save, now token-aware ──
drop function if exists public.sq_save_user(text, jsonb, text, text, text, text);

create or replace function public.sq_save_user(
  p_username text,
  p_data jsonb,
  p_password_hash text default ''::text,
  p_salt text default ''::text,
  p_email text default null::text,
  p_carry_pro_from text default null::text,
  p_token text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  o public.users%rowtype;
  g public.users%rowtype;
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

revoke all on function public.sq_save_user(text, jsonb, text, text, text, text, text) from public;
grant execute on function public.sq_save_user(text, jsonb, text, text, text, text, text) to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
