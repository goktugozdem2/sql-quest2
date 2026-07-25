-- In-app feedback channel.
--
-- WHY: as of 2026-07-25 the app had no contact affordance at all — no mailto,
-- no help, no feedback button — and all 8 published mailto links pointed at
-- support@sqlquest.app on a domain with NO MX record (`host -t MX sqlquest.app`
-- → "has no MX record"). Every message a user sent us was discarded by DNS,
-- including from the refund page. This table is the channel that does not
-- depend on email working.
--
-- APPLIED 2026-07-25 to the production project (abmgtjafghpupaqsjnwe).
-- Verified after applying: anon INSERT reaches the CHECK constraint (23514,
-- i.e. permitted, not an RLS denial) and anon SELECT returns []. End-to-end
-- submit from the live app landed a row with full context.

create table if not exists public.feedback (
  id          bigserial primary key,
  username    text,
  message     text not null,
  contact     text,                                   -- optional, so we can reply
  screen      text,                                   -- where they were when they wrote
  context     jsonb not null default '{}'::jsonb,     -- solves, guest, tz, viewport, UA
  created_at  timestamptz not null default now(),
  constraint feedback_message_len check (char_length(message) between 1 and 4000),
  constraint feedback_contact_len check (contact is null or char_length(contact) <= 200)
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- INSERT-only for anon, deliberately. Users can submit; nobody can read
-- anyone else's feedback back out through the public anon key. There is no
-- select policy, so anon SELECT returns zero rows even though the key is
-- shipped in app.js.
--
-- Unquoted identifier on purpose — this was applied through the dashboard SQL
-- editor, where a quoted name with spaces is one auto-paired quote away from
-- silently becoming something else.
drop policy if exists anon_can_submit_feedback on public.feedback;
create policy anon_can_submit_feedback
  on public.feedback for insert
  to anon with check (true);

-- Read it with:
--   select created_at, username, screen, message, contact,
--          context->>'solvedCount' as solves, context->>'isGuest' as guest
--   from feedback order by created_at desc limit 50;
