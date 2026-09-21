# Daily smoke test with alerts; automatic rollback on critical failures (2026-09-21)

## Why
Two outages were found by people, not by us: 2026-09-17, a half-edited
`app.jsx` blanked `/app` for ~9 minutes; 2026-09-08 → 09-12, no account could
be created or saved for four days while guest rows kept flowing. CI runs
lint, tests and the build on push (`.github/workflows/ci.yml`) — nothing
checks production after deploy, and nothing runs on a schedule.

## What it is
1. **The smoke bot.** A scheduled GitHub Actions job that runs
   `scripts/smoke-test.js` (8 checks) and a few harness scenarios
   (`scripts/qa/pro-mock.mjs`: app loads, a challenge opens and grades, the
   Pro modal opens, a deep link keeps the session) against
   `https://sqlquest.app` — daily, and after every production deploy.
2. **Alerts.** On failure only, one email to the founder through Resend,
   deduplicated per failing check per day. Resend hit 80% of its daily quota
   on 2026-09-12; an alert that fires every run would compete with real mail.
3. **Automatic rollback — narrow.** Only for the front-end-is-dead class:
   `/app` renders nothing, `app.js` 404s, or an uncaught error on load. Action:
   Vercel instant rollback to the previous production deployment, then alert.
   Never for a failing business check, and never when the deploy carried a
   database migration or an edge-function change — rolling back the static
   front end past a schema change can break it worse.

## What it does not change
- CI's gates on push.
- Who merges. A rollback is followed by a human fix, not a retry.

## Needs from the founder
- A Vercel token scoped to the project, stored as a GitHub secret.
- Confirmation of the alert address.

## Claim
Operational, not a product claim — no ledger entry. Track time from a broken
deploy to detection in the incident notes.

## Status
OPEN. First in the recommended order: it protects everything else.
