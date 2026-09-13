-- Plan and server-set fields belong to the server (2026-09-14).
--
-- sq_save_user (20260913130000) already keeps an existing row's credential,
-- email and payment-id keys. This extends the same rule to the plan fields
-- and the markers the email senders write, so a client save can no longer
-- change them in either direction:
--   plan:    proStatus, proType, proExpiry, proAutoRenew, proGrantReason
--   senders: emailOptOut, trialReminder_2days_sent_at, trialReminder_1day_sent_at,
--            checkoutAbandonEmailAt, lastSkillDecayEmail, lastWelcomeBackEmail
-- They are written by stripe-webhook, claim-referral-reward, the email
-- functions and by hand (all service role), never by the app.
--
-- A new row starts on the free plan. The one legitimate carry is a guest who
-- paid and then creates an account: the client names the guest row in
-- p_carry_pro_from, and the plan fields are copied from THAT row as the
-- server holds it — never from the request.
--
-- Also: ai_usage had a policy named "Service role full access" applied to
-- role public with USING (true). The service role bypasses RLS and needs no
-- policy; the policy only opened the table to everyone else.
--
-- Apply: supabase db query --linked -f supabase/migrations/20260914100000_server_owned_account_fields.sql

begin;

drop function if exists public.sq_save_user(text, jsonb, text, text, text);

create or replace function public.sq_save_user(
  p_username text,
  p_data jsonb,
  p_password_hash text default '',
  p_salt text default '',
  p_email text default null,
  p_carry_pro_from text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.users%rowtype;
  g public.users%rowtype;
  v_hash text;
  v_salt text;
  v_email text;
  v_data jsonb;
  v_keep jsonb;
  k text;
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
      return;
    end if;
    -- lost a race with another insert: fall through to the update path
  end if;

  -- ── existing row ──
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
$$;

revoke all on function public.sq_save_user(text, jsonb, text, text, text, text) from public;
grant execute on function public.sq_save_user(text, jsonb, text, text, text, text) to anon, authenticated;

drop policy if exists "Service role full access" on public.ai_usage;

commit;
