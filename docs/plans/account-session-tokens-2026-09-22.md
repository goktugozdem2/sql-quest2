# Account session tokens — reads and writes need a secret, not just a username (2026-09-22)

**Priority: P0 security. Decision needed from the founder** (it signs every
returning user out once).

## What was found (2026-09-22)
Checking what `users_public` shows to the anon key — the key in every
browser — turned up two things:
1. **Reads.** One unfiltered request listed all 7,251 account rows, each with
   the person's written queries, attempts and plan status, and where set their
   intake (487 rows) and interview target (20 rows). 417 are named accounts.
   **Fixed the same night:** the client reads one row through
   `rpc/sq_load_account`, and anon's SELECT on `users_public` is revoked
   (probed: 401 permission denied).
2. **Writes — not fixed.** `rpc/sq_save_user` verifies nothing. Anyone with
   the anon key who knows a username can replace that account's `data` — its
   progress, streak, attempts. Credentials, email and payment fields are kept
   by the function (migration 20260914100000), so it cannot take over an
   account or grant Pro, but it can wipe one.
And the one-row read is still keyed by username alone: knowing a username is
enough to read that row.

## Why
There is no session secret. `account-login` checks the password and returns
the row, and from then on the browser remembers only the username
(`localStorage.sqlquest_user`). Every later read and write is "this
username, please".

## What it is
1. `account-login` mints a random session token, stores its hash in
   `account_sessions (username, token_hash, created_at, last_used_at)`, and
   returns the token. Registration does the same.
2. The client keeps the token beside the username and sends it with every
   account read and write.
3. `sq_load_account(p_username, p_token)` and `sq_save_user(…, p_token)`
   verify the token's hash for that username. No match: read returns nothing,
   write raises.
4. Guests: the guest id (`guest_<ms>`) is guessable. Mint a random guest
   secret at guest creation, store its hash on the row at first save, same
   check. Guests are local-first, so a failed cloud read costs them nothing.

## Release order (the 09-13 pattern: additive first, cut last)
1. Migration: `account_sessions`, token-aware versions of both functions that
   ALSO accept a missing token (logged, `session_token_missing`).
2. Client: sends the token; login and register store it.
3. Watch `session_token_missing` fall as people sign in again.
4. Cut: functions refuse a missing token. Everyone still without a token
   signs in once. This is the step that needs the founder's go.

## Risk
A mistake here signs people out or loses a save. `tests/cloud-save-contract`
and `tests/account-access` must grow a token column before any of it ships;
the e2e script's account section must pass against production.

## Decision (founder, 2026-09-22)

"Oturum anahtarı: onayla, bu hafta" — approved this week, including step 4's
forced sign-in. "Misafirler de kapsamda olmalı. 6.833 misafir satırı var" —
guests are in scope from the first release, not a follow-up:

- **New guests** mint a 32-byte random secret with `crypto.getRandomValues`
  at `startGuestMode`, kept in `localStorage` beside `sqlquest_guest_user`,
  sent with every guest save/read. The row stores only its SHA-256.
- **The 6,833 existing guest rows** have no secret. Trust on first use: the
  first token-carrying save for a guest row with no stored hash sets it.
  The exposure is a stranger claiming an idle guest row first — which costs
  the owner only the CLOUD copy (guests are local-first; the local blob keeps
  working and the next merge-on-login carries it). Accepted, written here so
  it is a decision and not an oversight.
- **Registered accounts** get their token from `account-login` / register;
  step 4 signs everyone in once.
- Until the cut, `sq_save_user` already refuses a save that drops solved
  challenges or XP by more than 20% (migration 20260922160000, live; probe:
  HTTP 400 "regression refused: solved 85 -> 0, xp 26447 -> 0"). That stops
  the wipe, not the write: an attacker can still add, rename or edit.

## Status
APPROVED 2026-09-22, build this week in the release order above. Reads
narrowed (sq_load_account, anon select on users_public revoked); the
regression guard is live; tokens not yet built.

2026-09-22 (UTC 00:00): steps 1–2 LIVE — migration applied after a
rolled-back dry run, account-login / account-password deployed, client
pushed (abb52079). Nothing refuses yet. Before the step-4 cut, these must
close (found in the build review):
- the register form's "username taken" check reads through sq_load_account
  with no token; after the cut it would see nothing — move it to
  `sq_username_registered` first;
- `p_carry_pro_from` copies Pro from any paid guest row without the guest's
  secret — require it;
- email password reset does not end existing sessions; logout clears the
  token only in the browser.

2026-09-24: the four gaps BUILT, not applied (branch, not main). Migration
`20260924100000_session_token_gaps.sql`, rollback
`supabase/manual/20260924_session_token_gaps_rollback.sql`, local proof
appended to `supabase/manual/account-session-tokens-replica-test.sql`
(passes; mutation-checked on gaps 2 and 3). Additive — nothing that works
today is refused:
1. **Username taken — CLOSED (client only).** Both register forms ask
   `rpc/sq_username_registered` (anon, boolean, no token); no existence check
   reads through `sq_load_account`. `guest_*` names are now refused at
   registration: a guest row has no password, so the function calls it free,
   and taking the name would write over that guest's cloud row. Residual:
   3 named rows in production have no password (read 2026-09-23) and read as
   free — the old check blocked them; `sq_save_user` would give the
   registrant that row. Small, pre-existing on the guest-conversion form;
   a server-side "a new password never lands on an existing row" rule would
   close it.
2. **Carried Pro — CLOSED in the step-1 sense.** `sq_save_user` gains
   `p_carry_token` (the guest's own secret, sent by `withCarry`). Match →
   carried; the guest has no stored secret → carried + 'missing' recorded
   against the guest; no `p_carry_token` sent (an old tab) → carried +
   'missing'; a WRONG secret → not carried, 'invalid'. **At the cut, a
   missing carry token must stop the carry too** — same rule as p_token.
3. **Reset ends sessions — CLOSED.** `sq_set_password_for_session_email`
   deletes the account's `account_sessions` rows in the same statement.
   (account-password already did; there is no other reset path.)
4. **Logout ends the server row — CLOSED.** `sq_end_session(p_username,
   p_token)`, anon-callable, deletes only the row matching both; the client
   calls it fire-and-forget before clearing the local token.

Release: migration → client (either order is safe: the new client sheds
`p_carry_token` on a 404 and ignores a failed `sq_end_session`; the old
client resolves to the new function unchanged). What remains for the cut:
watch `session_token_misses` fall (step 3); then one migration that turns
'missing'/'invalid' into refusals in `sq_load_account`, `sq_save_user` AND
the carry; the founder's go.

2026-09-25: the cut, PREPARED — nothing applied, deployed or pushed
(branch only). Three pieces, and the order is the whole defence:

**A — migration `20260925100000_session_token_cut_prep.sql`** (additive).
Closes the residual of gap 1: `sq_username_registered` now answers true for
ANY existing non-guest row (a row exists = the name is taken), so
brallie / mike_sql / saida240690 read taken. Its only callers are the two
sign-up forms in app.jsx (auth-screen register, guest signup prompt); both
want "is this name free for a new account", both refuse `guest_*` first, no
edge or SQL function calls it — so the meaning changed in place, no second
function. `sq_save_user` refuses (28000, "password refused: …") to set a
password on an existing non-guest row that has none unless the save carries
that row's valid session token — byte-identical body plus one marked block.
Rollback `supabase/manual/20260925_session_token_cut_prep_rollback.sql`.

**C — the client (ships before B; inert until B).** On "session token
required" from `sq_load_account` or `sq_save_user`: a registered account
that is the one on screen (or when nobody is — page load, sign-in) has its
token and `sqlquest_user` cleared, its local blob KEPT, a relogin marker
set, and the sign-in screen opens with "For your account's security, please
sign in again — your progress is safe." The sign-in reads the kept blob
before account-login's record overwrites it and merges it the save-recovery
way (`mergeProgress` over `withLocalAccountKeys`, saved with force). A
refused name stops sending for the rest of the page; `loadUserSession` no
longer reads a refusal as "account deleted" (which would have dropped the
local copy). Guests: keep the local blob; a fresh identity only when this
browser's guest has nothing to keep, at most once per page (a local probe
that refused every save looped without that guard). A late debounced flush
for an account no longer on screen is recorded and signs nobody out.
Events `session_token_refused {kind, registered, action[, guest]}`,
`session_relogin_shown {kind}`, `session_relogin_completed {carriedSolves,
carriedAttempts}`. Guards: `tests/session-token-cut.test.js`.
Rollback: revert the commit (nothing server-side depends on it).

**B — `supabase/manual/20260925b_session_token_cut.sql`, NOT a migration.**
On an EXISTING row with a missing or wrong token, `sq_load_account` and
`sq_save_user` RAISE 28000 "session token required" (the load raises rather
than returning nothing: empty means "no such account" to the client, which
deletes its local copy then). A new row needs no token (registration, a new
guest); a guest row with no stored secret is claimed by the first
token-carrying save (a tokenless one is refused); a carried plan needs the
guest's own secret (an unclaimed paid guest is claimed by the carry);
JWT role `service_role` and a direct database session are never refused.
Regression guard, server-owned fields and A's rule kept. A refused call
rolls back, so from the cut on `session_token_misses` no longer counts
refusals — read `session_token_refused` and the postgres error log.
Rollback `supabase/manual/20260925b_session_token_cut_rollback.sql` (back to
step 1 exactly; A's rule stays). Local proof for A and B:
`supabase/manual/account-session-tokens-replica-test.sql` (passes; nine
single-line mutations each fail it by name).

**Release order.**
1. `supabase db query --linked -f supabase/migrations/20260925100000_session_token_cut_prep.sql`
2. Push the client (C); confirm the live bundle carries `relogin-notice`.
3. Watch, daily: distinct named usernames with a 'missing' per day in
   `session_token_misses`, until it is near zero AND it is at least 7 days
   since 2026-09-22 (so not before 2026-09-29), with C live for several of
   those days so open tabs have reloaded.
4. Founder's explicit go in chat — then
   `supabase db query --linked -f supabase/manual/20260925b_session_token_cut.sql`.
5. Same day: read `session_token_refused` / `session_relogin_completed` and
   the postgres error log; roll back B if accounts cannot get back in.

**What the founder will see.** Everyone signed out by B is a registered
account whose browser holds no token for it: they get the sign-in screen
with the sentence, once, and their progress is merged back after the
password. Measured 2026-09-24 (read-only): 23 distinct named usernames
recorded a 'missing' in the 7 days (18 on 09-22, 12 on 09-23), 18 of which
have never held a session; 10 guests; 0 'invalid'; 36 accounts hold a
session. Re-measure the day before the go:
`select count(distinct username) from session_token_misses where username
not like 'guest\_%' and kind = 'missing' and at > now() - interval '7 days';`
— that number is the upper bound on who B signs out (anyone active but not
in it already holds a token). Some 'missing' rows are not people at all: a
debounced save that fires after logout carries no token. Three accounts
cannot sign in at all, before or after the cut, because their rows have no
password — brallie, mike_sql, saida240690 (only saida has an email for the
reset); B makes them unable to save too. Setting a password for them is a
founder decision.

Original build note: steps 1–2 BUILT. Migration
`20260923100000_account_session_tokens.sql` (tables account_sessions,
guest_secrets, session_token_misses; token-aware sq_load_account /
sq_save_user that record `missing` / `invalid` at most once per username per
hour and refuse nothing), rollback `supabase/manual/20260923_account_session_tokens_rollback.sql`,
local proof `supabase/manual/account-session-tokens-replica-test.sql`.
account-login returns `sessionToken`; account-password rotates it; registration
gets its token by calling account-login with the credentials it just set.
Client: `src/utils/session-token.js`, p_token on every read and write.
Release: migration → `supabase functions deploy account-login account-password`
→ client. Step 3 reads `session_token_misses`.
