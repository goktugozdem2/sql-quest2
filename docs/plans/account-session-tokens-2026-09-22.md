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

## Status
OPEN — reads narrowed 2026-09-22; writes and per-username reads waiting on
the founder's decision about step 4.
