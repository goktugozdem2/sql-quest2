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
