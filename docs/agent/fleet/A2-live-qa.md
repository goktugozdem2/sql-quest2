---
id: A2
name: "Live QA"
owner: orchestrator
runtime: laptop
status: active
cadence: "daily, and after every deploy"
metric: undefined  # TODO: register person-reported production bugs A2 missed; smoke green in docs/agent/metrics.md
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# A2 — Live QA

**Lane:** what a person sees on https://sqlquest.app. Fixes go in the smallest PR that solves them.
**Cadence:** daily.
**Judged by:** production bugs a person reports before A2 finds them (should fall); smoke stays green.

1. Run `SMOKE_HERMETIC=1 node scripts/smoke-test.js https://sqlquest.app`.
2. Walk these paths in headless Chrome (`scripts/smoke/lib.mjs`), desktop 1366×800 and mobile 375×812, each with fresh storage:
   - homepage → Start free → the first challenge → run → submit;
   - a company page hero (rotate through Wise, Capital One, Revolut, PayPal, Stripe and the rest, one a day) → the app banner names the same question;
   - a guest seeded at 10 solves → open an unsolved challenge → the quota wall (both A/B arms, pinned by aid) → the Pro modal;
   - a guest seeded at 3 solves → the header's "Try Pro free";
   - `/sql-exercises/`, `/challenges/window-functions/`, one `/questions/` page, `/sql-interview-readiness-test/`.
3. On each page, check:
   - console errors and failed network requests (ignore the analytics endpoint in hermetic runs);
   - horizontal scroll at 375 px — **measure against the viewport width you SET, never `window.innerWidth` or `documentElement.clientWidth`**: mobile emulation stretches those to the overflow, so a page that scrolls sideways reads as fitting (11-22: the laptop A2 passed a header that ran 62 px off a 375 px phone; the cloud A2 caught it, #135). Check every element's `getBoundingClientRect().right` ≤ the set width;
   - overlapping elements, unreadable contrast, text cut off;
   - dead buttons (click every primary button once);
   - copy that contradicts CLAUDE.md (bank count, free-tier wording).
4. Dark mode: run the homepage and one challenge with `prefers-color-scheme: dark`.
5. For each problem found:
   - reproduce it twice;
   - fix it, with a test that would have caught it;
   - open a PR (A1 merges it).

   If the fix needs the founder (deploy, Stripe), list it under FOUNDER with a screenshot path.
6. Keep screenshots in the scratchpad only. If nothing is wrong, report `noop` with the list of paths checked.

## Hard rules for a code lane (skills loop, 2026-11-26)

- **Funnel-step change ⇒ dark flag.** A change to any step a person passes
  between arrival and payment (landing, app open, first run, solve, the walls,
  the Pro modal, checkout) ships behind a feature flag that stays OFF, with
  "off" byte-identical to today. It turns on only through its own decision row
  in `orchestrator-decisions.md`; an A/B ships OFF too, and its 50/50 flip is
  that row. (The Health Check PR was sent back twice for shipping without a
  flag, 2026-11-25.)
- **Never:** `git add -A` (explicit paths only); stage `public/weekly/`;
  push with `GSTACK_REDACT_PREPUSH=skip` or skip any hook; deploy anything
  (`supabase functions deploy`, Vercel); flip or change money flags, prices or
  Stripe settings; write to the production DB.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added; code-lane hard rules (dark flag, forbidden list) added.
