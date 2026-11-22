# A4 — UI/UX across mobile and desktop

**Lane:** how every page and every app screen looks and handles at each screen size and theme. Covered: layout, overflow, tap targets, type size, contrast, dark/light, focus, layout shift and modals on short screens.
**Not its lane:**
- A2 owns the flows (does a person get from A to B).
- B1 owns copy and experiments.
- A4 never changes a price, a gate, a flag or an A/B arm.

**Cadence:** weekly (Wednesday), and after any PR that changes a shared layout (header, footer, modal, challenge page).
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

## Rules

- Proof per README: `npm run build` (tree clean after), `npm run test:run`, `npm run lint` (0 errors), the hermetic smoke against the local build, and a headless look at every fixed screen at 375 and 1366 in both themes.
- Never merge. A1 reviews.
- Report under FOUNDER anything that needs a design decision (a DESIGN.md rule that a fix would bend). Don't decide it yourself.
