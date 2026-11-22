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
