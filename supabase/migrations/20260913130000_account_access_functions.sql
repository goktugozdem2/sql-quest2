-- Account reads and writes move behind functions — step 1 of 2.
--
-- ADDITIVE ONLY. Nothing here changes what the current client can do; it adds
-- the view and functions the next client release uses. Step 2
-- (supabase/manual/20260913b_users_direct_access_off.sql) switches off direct
-- table access and is applied only after that client release is live and
-- verified — never before, or every save breaks (see CLAUDE.md, "Database
-- writes": an upsert that loses a privilege fails silently for days).
--
-- Apply: supabase db query --linked -f supabase/migrations/20260913130000_account_access_functions.sql
--
-- Keys that belong to the account owner and the server only. They are never
-- returned by users_public, and a client save can set them only on a row that
-- does not have them yet.
--   passwordHash, salt, email          (also mirrored in columns)
--   unsubToken, stripeCustomerId, stripeSessionId

-- ── 1. What the client may read ─────────────────────────────────────────────
-- A definer view on purpose (security_invoker = false): step 2 removes the
-- client's own SELECT on public.users, and this view is how it keeps reading
-- progress (own row on login, the leaderboard, username availability).
create or replace view public.users_public
with (security_invoker = false) as
select
  u.username,
  case when jsonb_typeof(u.data) = 'object'
       then u.data - 'passwordHash' - 'salt' - 'email' - 'unsubToken' - 'stripeCustomerId' - 'stripeSessionId'
       else '{}'::jsonb end as data,
  u.created_at,
  u.updated_at
from public.users u;

comment on view public.users_public is
  'Client-readable account rows without credentials, email or payment ids. Definer view by design; see 20260913130000_account_access_functions.sql.';

grant select on public.users_public to anon, authenticated;

-- ── 2. Is this email already registered? (sign-up form) ─────────────────────
create or replace function public.sq_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where lower(trim(p_email)) <> ''
      and lower(coalesce(nullif(u.email, ''), u.data->>'email')) = lower(trim(p_email))
  );
$$;

revoke all on function public.sq_email_registered(text) from public;
grant execute on function public.sq_email_registered(text) to anon, authenticated;

-- Is this username a registered account (a row with a password)? Guest
-- conversion needs this; users_public no longer shows password fields.
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
      and coalesce(nullif(u.password_hash, ''), nullif(u.data->>'passwordHash', '')) is not null
  );
$$;

revoke all on function public.sq_username_registered(text) from public;
grant execute on function public.sq_username_registered(text) to anon, authenticated;

-- ── 3. The one write path for client saves ──────────────────────────────────
-- Same shape as the old PostgREST upsert (username, password_hash, salt,
-- email, data), so the client change is one call site. On an existing row the
-- server-held keys come from the row, not the request; a key the row does not
-- have yet may be set (a new account, a first email). Everything else in
-- `data` is taken as sent, exactly as before.
create or replace function public.sq_save_user(
  p_username text,
  p_data jsonb,
  p_password_hash text default '',
  p_salt text default '',
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.users%rowtype;
  v_hash text;
  v_salt text;
  v_email text;
  v_data jsonb;
  v_keep jsonb;
  k text;
begin
  if p_username is null or length(p_username) = 0 or length(p_username) > 64 then
    raise exception 'invalid username' using errcode = '22023';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid data' using errcode = '22023';
  end if;

  -- A brand-new row: written as sent (this is sign-up and first guest save).
  insert into public.users (username, password_hash, salt, email, data, updated_at)
  values (
    p_username,
    coalesce(nullif(p_password_hash, ''), p_data->>'passwordHash', ''),
    coalesce(nullif(p_salt, ''), p_data->>'salt', ''),
    nullif(lower(coalesce(nullif(p_email, ''), p_data->>'email', '')), ''),
    p_data,
    now()
  )
  on conflict (username) do nothing;
  if found then
    return;
  end if;

  select * into o from public.users where username = p_username for update;

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

  -- Server-set keys: the row's value wins; the request may only fill a gap.
  foreach k in array array['unsubToken', 'stripeCustomerId', 'stripeSessionId'] loop
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
$$;

revoke all on function public.sq_save_user(text, jsonb, text, text, text) from public;
grant execute on function public.sq_save_user(text, jsonb, text, text, text) to anon, authenticated;

-- ── 4. Flows proven by a Supabase Auth session for the email ────────────────
-- Email verification link: mark the matching account verified.
create or replace function public.sq_mark_email_verified()
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
  with changed as (
    update public.users u
       set data = jsonb_set(u.data, '{emailVerified}', 'true'::jsonb, true),
           updated_at = now()
     where lower(coalesce(nullif(u.email, ''), u.data->>'email')) = v_email
       and jsonb_typeof(u.data) = 'object'
       and coalesce(u.data->>'emailVerified', '') = 'false'
    returning u.username
  )
  select min(username) into v_username from changed;
  return v_username;
end;
$$;

revoke all on function public.sq_mark_email_verified() from public;
grant execute on function public.sq_mark_email_verified() to authenticated;

-- Password reset link: the session proves the inbox; set the app password.
-- Same hash format the client computes (hex SHA-256 of salt || password).
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
  )
  select min(username) into v_username from changed;
  return v_username;
end;
$$;

revoke all on function public.sq_set_password_for_session_email(text, text) from public;
grant execute on function public.sq_set_password_for_session_email(text, text) to authenticated;

-- ── 5. Failed sign-in counter (read and written by the account-login function) ─
create table if not exists public.account_login_attempts (
  login text primary key,
  failures int not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.account_login_attempts enable row level security;
revoke all on public.account_login_attempts from anon, authenticated;
