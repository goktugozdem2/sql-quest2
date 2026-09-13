# Account security — what was found, fixed, and what remains (2026-09-14)

Read-only audit while fixing the homepage login bug turned up a set of
account-security problems in the shared Supabase project. This records what
shipped, verified against production, and the two decisions that are the
founder's to make. No user was emailed and no auth-model change was made
without sign-off.

## The `users` table was world-readable and world-writable

`public.users` had one RLS policy — `"Allow all"`, cmd ALL, role `public`,
`USING (true)` — and the anon key is shipped in the client bundle and in
`src/track.js`. So anyone could:

- **Read every account row.** 6,252 rows; 349 carried `passwordHash` + `salt`
  in `data`, 346 an email, plus unsubscribe tokens and 4 Stripe customer ids.
- **Write any row**, including another account's progress and the Pro fields.
- **Grant themselves Pro.** `data.proStatus=true` was accepted from a client
  save, and the AI tutor reads the plan from that row — so a forged Pro also
  unlocked 50–100 AI tutor calls a day.
- **Wipe their AI rate limit.** `ai_usage` had a policy named "Service role
  full access" that was actually applied to role `public` with `USING (true)`;
  a user could delete their own usage row and reset the daily cap.

## What shipped (all verified live 2026-09-14)

| Change | Migration / commit | Verified |
|---|---|---|
| Reads go through a `users_public` view with no credential/email/payment keys | `20260913130000` · 3842eef | view returns 200, leaks 0 protected keys |
| Writes go through `sq_save_user`, which keeps the row's own credentials/email/payment ids | `20260913130000` | anon GET on `users` → 401; saves flow through the RPC |
| Sign-in and password change move to edge functions (`account-login`, `account-password`) with a per-login lockout | commit 3842eef | both answer in prod; 15-check Deno test |
| Direct anon table access removed (step 2) | `20260913b` (manual) | anon GET/INSERT on `users` → 401 |
| The session-only functions revoked from anon | `20260914090000` | `has_function_privilege(anon, …)` = false |
| Plan + email-sender fields server-owned; `ai_usage` open policy dropped | `20260914100000` · 180a8bf | new signature live; policy count 0 |
| Homepage Log In no longer does a broken local password check | commit a3cd666 | links to `/app/?signin=1` |

The client falls back to the old table path only on HTTP 404, so each stage
was safe to ship before the server side existed. Guards:
`tests/account-access.test.js`; SQL behaviour on a local Postgres replica:
`supabase/manual/account-access-replica-test.sql`.

## Decision 1 — the historical leak (founder's call)

Rehashing on login protects **future** leaks; it does not undo the fact that
349 salted `passwordHash` values were publicly readable for months (single
round of SHA-256, so offline cracking of weak passwords is feasible). The
remediation for a past leak is a password reset. Options:

- **Do nothing.** The hashes are salted and no longer readable; most users
  never reused a weak password. Lowest effort, real residual risk.
- **Force a reset for the 349 registered accounts** on next login (a flag the
  client honours), or **email them** a reset link. Emailing is an outward
  action and follows the CLAUDE.md email voice; it is the founder's to send.

I did not email anyone. Say which option and I will build the client half.

## Decision 2 — account identity (needs a go before I build)

After every fix above, an **unauthenticated client can still write another
account's *progress*** (not its password, email, plan or payment): `sq_save_user`
trusts the `p_username` it is handed. Closing this needs the client to prove
identity — a Supabase Auth session or a signed token from an edge function —
and `sq_save_user` to write only the caller's own row.

This is an auth-model change touching every save and the guest flow. Done
wrong it locks users out, so it should not ride a plain "devam et". If you
green-light it I will do it in stages behind the 404-style fallback, with the
replica test extended first. Estimate: a focused session.

## Also noted, not mine to fix

The project is shared with other products (gorucu, tercihai, closeloop) whose
tables still grant anon select/insert/update and some have no policy. Outside
SQL Quest; flagging for a separate pass.
