-- Rollback for supabase/manual/20260925b_session_token_cut.sql (step 4).
--
-- Puts back the step-1 behaviour: sq_load_account as 20260923100000 wrote it
-- (records a missing or wrong token, refuses nothing) and sq_save_user as
-- 20260925100000 wrote it (the same, plus the password-less-row rule), and
-- drops sq_session_trusted_caller. Sessions, secrets and misses are kept.
-- Anyone signed out by the cut stays signed out until they sign in (their
-- local progress is kept by the client and merged on sign-in); nobody else
-- notices.
--
-- Apply: supabase db query --linked -f supabase/manual/20260925b_session_token_cut_rollback.sql

begin;

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

drop function if exists public.sq_session_trusted_caller();

commit;

notify pgrst, 'reload schema';
