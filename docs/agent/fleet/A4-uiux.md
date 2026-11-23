# A4 — UI/UX across mobile and desktop

**Lane:** how every page and every app screen looks and handles at each screen size and theme. Covered: layout, overflow, tap targets, type size, contrast, dark/light, focus, layout shift and modals on short screens.
**Not its lane:**
- A2 owns the flows (does a person get from A to B).
- B1 owns copy and experiments.
- A4 never changes a price, a gate, a flag or an A/B arm.

**Cadence:** daily, in GitHub Actions (`.github/workflows/uiux-daily.yml`, 05:40 UTC, from 2026-11-22); the full local audit after any PR that changes a shared layout (header, footer, modal, challenge page).
**Judged by:** findings per audit run (should fall to 0 critical and stay there), and UI bugs a person reports that the audit missed.

Founder's order, 2026-11-22: "Mobil ve web UI/UX ayarı test eden bi ajan yap, görev listesi hazırla, çalışsın, bütün görevleri bitirsin ve test etsin."

## The matrix

Viewports:

| name | size | notes |
|---|---|---|
| phone-s | 375×667 | short screen: modals, sticky bars |
| phone | 390×844 | |
| phone-android | 412×915 | |
| tablet | 768×1024 | |
| laptop | 1366×800 | |
| desktop | 1920×1080 | |

Themes:
- `prefers-color-scheme: dark`, the primary theme (DESIGN.md);
- light.

### The browser × device matrix (the daily run, `--matrix devices`)

Founder's order, 2026-11-22: "Hem Android hem iPhone'da hem desktop'ta Chrome ve Safari'de UI/UX kontrolleri yap; bir ajan bunu günlük kontrol etsin ve hataları düzeltsin."

Each row is a Playwright project: an engine plus a built-in device descriptor (`DEVICE_MATRIX` in `scripts/smoke/uiux-checks.mjs`, `playwrightProjects()` in `uiux-audit.mjs`). Every check U1–U18 runs on every row, in dark and light; a check that only applies to some rows says so below.

| row | engine | as | Playwright descriptor | viewport | flags |
|---|---|---|---|---|---|
| chrome-1366 | chromium | desktop Chrome | Desktop Chrome | 1366×800 | |
| chrome-1920 | chromium | desktop Chrome | Desktop Chrome | 1920×1080 | |
| safari-1440 | webkit | desktop Safari | Desktop Safari | 1440×900 | |
| iphone-se | webkit | iPhone | iPhone SE (3rd gen) | 375×667 | phone, short, touch, ios |
| iphone-15 | webkit | iPhone | iPhone 15 Pro | 393×659 | phone, touch, ios |
| pixel-7 | chromium | Android | Pixel 7 | 412×839 | phone, touch |
| galaxy-s9 | chromium | Android | Galaxy S9+ | 320×658 | phone, touch |
| ipad-mini | webkit | iPad | iPad Mini | 768×1024 | touch, ios |

- `phone`: U3, U4's phone body size, U7. `short`: U8 (the screen a modal must fit; `phone-s` in the viewport matrix). `touch`: U13, U18. `ios`: U15, U16, U17 (iOS Safari rules, judged on WebKit touch rows only).
- "iPhone SE" is the 3rd-gen descriptor (375×667); Playwright's plain "iPhone SE" is the 2016 model at 320×568. The Galaxy S9+ row is the narrow one at 320.
- Playwright is pinned in the workflow (`PLAYWRIGHT_VERSION`), so the descriptors do not move under the counts; a version bump is its own PR with a before → after run.
- An engine that will not launch is skipped and named in the report, never dropped silently.
- `--matrix viewports` (the default) keeps the six Chromium viewports below: that is what `uiux_findings` was baselined on.

### The honest limit

These are **engine emulations, not devices.** Playwright's WebKit is Safari's engine and its Chromium is Chrome's, each driven with a device's viewport, scale, user agent and touch. Call it cross-engine testing; never call it device testing. What it misses:
- iOS Safari's collapsing address bar and toolbar: emulated WebKit has a fixed viewport, so `100vh` equals the visible height. U13 reads the CSS (`vh` boxes with a control near their bottom) instead of seeing the bar.
- The on-screen keyboard: what it covers, how it resizes the visual viewport, and the input zoom itself. U15 checks the cause (an input under 16 px), not the zoom.
- Notch and home-indicator insets: `env(safe-area-inset-*)` is 0 in emulation. U16 checks the CSS, not the overlap.
- The native date picker and form controls: emulated WebKit draws Linux GTK controls, not iOS ones. U17 checks the rules iOS applies.
- Real device fonts, GPU, memory and CPU speed; Android Chrome's own UI; in-app webviews (Instagram, LinkedIn, Gmail), where `scrollTo({behavior:'smooth'})` has been seen to do nothing. U18 flags the call, not the no-op.
- Real Safari on macOS is close to Playwright WebKit but not identical (different builds, no Safari-specific features such as ITP).

A layout bug a person reports on a real phone that the audit missed goes into the harness as a new case before it is fixed.

## Checks (each one named, each with a severity)

| id | check | severity |
|---|---|---|
| U1 | horizontal scroll: `scrollWidth > innerWidth` on the document | critical |
| U2 | an interactive element (a, button, input, `[role=button]`) partly or fully outside the viewport horizontally | critical |
| U3 | tap target under 44×44 CSS px on phone viewports. Inline text links inside a paragraph are exempt. | major |
| U4 | body text under 14 px on phones, or any text under 12 px | major |
| U5 | text clipped: an element with `overflow:hidden` whose `scrollWidth`/`scrollHeight` exceeds its box | major |
| U6 | contrast below WCAG AA (4.5:1 body, 3:1 for ≥ 24 px or bold ≥ 18.66 px), computed against the effective background | major |
| U7 | a fixed or sticky element covering a primary button at any scroll position on phones | critical |
| U8 | a modal taller than the viewport that cannot scroll to its own primary button on phone-s | critical |
| U9 | images or iframes without dimensions (layout shift); measured CLS > 0.1 on load | minor |
| U10 | keyboard: a primary button not reachable by Tab, or no visible focus ring | major |
| U11 | DESIGN.md: a blacklisted font in computed styles; the accent `#FFE34D` / `#F5C518` used as a border or background outside its allowed places | minor |
| U12 | console errors or failed same-origin requests during the run (analytics excluded) | major |

Mobile-browser checks (2026-11-22, with the matrix). They matter most on iPhone Safari:

| id | check | rows | severity |
|---|---|---|---|
| U13 | a `vh`-sized box (≥ 90 % of the screen) with a control within 80 px of its bottom, where the page cannot scroll it clear: the mobile toolbar covers it. Fix with `100dvh` / `100svh`. | touch | major |
| U14 | `position: sticky` inside an `overflow: hidden` ancestor: it never sticks. Fix with `overflow: clip`. A deliberate auto/scroll scroller is trusted. | all | major |
| U15 | a text input, select or textarea (CodeMirror's hidden one included) under 16 px: iOS zooms on focus and stays zoomed | ios | major |
| U16 | with `viewport-fit=cover`, a full-width fixed top/bottom bar holding a control and no `env(safe-area-inset-*)` | ios | major |
| U17 | a date-type input with a placeholder and no label (iOS shows none), or empty with no min-height (collapses) | ios | minor |
| U18 | a programmatic `scrollTo` / `scrollIntoView` / `scrollBy` with `behavior: 'smooth'` during the run: a no-op in some webviews (CLAUDE.md: scroll instantly) | touch | minor |

## The surfaces

1. **Marketing:**
   - every page in `public/sitemap.xml`, except `/questions/`, which gets a sample of 5 because it is one template;
   - every `*-sql-interview` page, including those added this week.
2. **App** (`/app/`, guest, hermetic: stub every write to Supabase and every tutor call; never a real tutor call). Each screen is seeded through localStorage or the same helpers `scripts/smoke/lib.mjs` uses:
   - first-run challenge (both first-screen arms, pinned)
   - the challenge page: editor, Run, Submit, result + diagnosis + Your/Expected output
   - challenge list with filters
   - quota wall modal (guest at 10 solves; both `quotaWallInline` arms, pinned by aid)
   - Pro modal (plans + trial line), header "Try Pro free" (guest at 3 solves)
   - Coach tab, Skillmap
   - Interview tab, a mock interview in progress
   - auth modal, the feedback widget, the company banner (`?company=Wise`)

## Task list for the first run

1. **Build the harness.**
   - Write `scripts/smoke/uiux-audit.mjs`. It runs the matrix × surfaces with Playwright (pre-installed; `require('playwright')`, `chromium.launch()`), runs U1–U12, and writes JSON to the scratchpad.
   - It also writes a Markdown report: counts by check × viewport, then each finding with page, viewport, theme, selector and a screenshot path (screenshots stay in the scratchpad).
   - Add an `npm run uiux` script.
   - Prove each check with a deliberate break: a fixture page that violates it must produce exactly that finding. Fixtures and their test go in `tests/uiux-audit.test.js` (pure check functions in `scripts/smoke/uiux-checks.mjs`, unit-tested on fixture DOM data, so vitest stays fast and browser-free).
2. **Baseline run** against `npm run build` + `npx serve public`. Commit the report as `docs/reads/uiux-audit-2026-11-22.md`. Use counts and selectors only; no screenshots in the repo.
3. **Fix the critical findings first, then the major ones.**
   - Group the findings by root cause. One PR per root cause, at most 6 PRs this run.
   - Each fix has a test that fails without it.
   - Generated pages change through their generator, never through `public/`.
   - Visual choices follow DESIGN.md: no new colour or font; accent only where allowed.
4. **Do not edit** the surfaces of open PRs:
   - #135 (the phone header's Try Pro button);
   - #136 (the footer link row);
   - #134 (the Chime page).

   Base on main. If the audit finds something there, write it in the report under "waits on #N".
5. **Final run.**
   - Re-run the full audit with all fix branches merged locally into one scratch branch, and write before → after counts per check in the report.
   - The report PR is docs-only and can carry the harness only if the harness has no product change. Otherwise the harness goes in its own PR.
6. **Wire it in.** Add the audit's critical checks (U1, U2, U7, U8) on the homepage, one company page and the challenge page, at 375 and 1366, as one advisory step in `scripts/smoke-test.js`, behind `SMOKE_UIUX=1`. Making it blocking is the founder's call after a week of clean runs.
7. **Ledger claim** for the fixes:
   - metric: critical + major findings per run (define it in `docs/agent/metrics.md` as `uiux_findings`);
   - baseline from step 2;
   - target 0 critical;
   - falsification: a person-reported layout bug on a covered surface within 28 days;
   - read 2026-12-20.

## The daily run (from 2026-11-22)

`.github/workflows/uiux-daily.yml`, 05:40 UTC every day and by hand (`workflow_dispatch`):

1. `npm ci`, then Playwright at the pinned version and `npx playwright install --with-deps chromium webkit`. Installing browsers is fine on the runner; it is banned only in a cloud session.
2. The audit against https://sqlquest.app, `--matrix devices`, every sitemap page (`/questions/` sampled to 5) and the 13 app screens, dark and light.
   - **Hermetic.** Every Supabase request, every edge function (the AI tutor included), `/api/` and analytics are answered inside the browser, the same stubs as `SMOKE_HERMETIC=1`. No production row, no event, no billed tutor call. The harness refuses a non-local base without `UIUX_HERMETIC=1`.
   - Cost: page loads only. The app screens pull `app.js` and `data.js` (~1 MB gzipped) per run, about 200 MB a day of Vercel bandwidth.
3. The JSON + Markdown report and the screenshots go up as an artifact, kept 14 days.
4. `scripts/smoke/uiux-issue.mjs` keeps **one** open issue labelled `uiux-audit`:
   - critical or major findings → open it, or rewrite its body: new since the last run first (page, device, browser, theme, selector, check), then the whole queue grouped by root cause (check + selector);
   - a comment only when something is new;
   - 0 critical and 0 major → close it;
   - "the last run" is the previous run's `findings.json`, kept in the Actions cache.
5. Advisory: it fails nothing else, gates nothing and never rolls back. A job failure (not a finding) comments on the issue.

Guard: `tests/uiux-daily-workflow.test.js` (schedule, hermetic flags, both engines, 14 days, one issue, no secret printed, no rollback).

## The fix loop (daily)

1. The open `uiux-audit` issue is A4's queue. Read it first each day.
2. Fix **critical first, then major**, by **root cause** (the queue is grouped by check + selector; one CSS rule broken on 60 pages is one fix).
3. **At most 3 fix PRs a day.** Each one:
   - has a test that fails without the fix, proven by a deliberate break the commit names;
   - changes generated pages through their generator, never `public/`;
   - follows DESIGN.md (no new colour or font; accent only where allowed);
   - says which rows it was seen on, and which it could not be walked on (WebKit rows from a cloud session run only in Actions).
4. A1 reviews; A0 gates. A4 never merges.
5. The next day's run confirms the fix: the finding leaves the issue. If it does not, the fix was not the root cause; reopen it in the issue body's queue, not in a new issue.
6. A false positive is fixed in the harness (with a fixture), never by a selector skip-list.

## Rules

- Proof per README: `npm run build` (tree clean after), `npm run test:run`, `npm run lint` (0 errors), the hermetic smoke against the local build, and a headless look at every fixed screen at 375 and 1366 in both themes.
- Never merge. A1 reviews.
- Report under FOUNDER anything that needs a design decision (a DESIGN.md rule that a fix would bend). Don't decide it yourself.
