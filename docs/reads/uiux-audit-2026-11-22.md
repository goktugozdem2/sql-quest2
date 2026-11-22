# UI/UX audit — baseline and first fixes (2026-11-22)

A4's first run (brief: `docs/agent/fleet/A4-uiux.md`, on PR #131). The harness is
`npm run uiux` (`scripts/smoke/uiux-audit.mjs`, PR #141). This file holds
counts and selectors only; screenshots stayed in the session's scratchpad.

## What was run

- **Surfaces:** 133. That is every sitemap page with `/questions/` sampled to 5 (120 pages), plus
  13 app screens:
  - both first-screen arms;
  - the home at 3 solves;
  - a challenge after Run + Submit;
  - the challenge list;
  - the quota wall in both `quotaWallInline` arms (pinned by aid);
  - the Pro modal;
  - the Interview tab;
  - a mock in progress;
  - the auth modal;
  - the feedback widget;
  - `?company=Wise`.
- **Matrix:** 375×667, 390×844, 412×915, 768×1024, 1366×800, 1920×1080, dark and light:
  1,596 runs.
- **Build:** `npm run build` of `origin/main` at 523aa1d, served with `npx serve public`.
- **Hermetic:** Supabase, every edge function (the tutor included), `/api/`
  and analytics were answered in the browser. No save, no tutor call.
- **Sandbox caveat:** this cloud sandbox blocks unpkg, cdnjs and jsdelivr, so
  React, sql.js, CodeMirror, lucide and supabase-js were served from npm
  copies of the pinned versions (`UIUX_VENDOR_DIR`), with SRI dropped. Lucide
  icons rendered empty. Layout is unaffected; icon-only buttons are slightly
  narrower than in production.
- **Counting:** a finding is deduplicated per page × viewport × theme ×
  selector, and a selector is a signature (tag + two classes under the nearest
  landmark), not a unique path. Most marketing pages are dark-only, so the
  light runs repeat the dark findings; read trends, not absolutes.

## Before → after

"After" is the full audit re-run on one scratch branch with all six fix PRs
merged and rebuilt (`npm run build`, 2,935 tests passing on it). None of
the fixes is on main yet.

| check | severity | before | after | change |
|---|---|---:|---:|---:|
| U1 horizontal scroll | critical | 22 | 0 | -100 % |
| U2 interactive element off screen | critical | 34 | 0 | -100 % |
| U3 tap target under 44×44 | major | 4212 | 2244 | -47 % |
| U4 text too small | major | 12532 | 9982 | -20 % |
| U5 text clipped | major | 6 | 0 | -100 % |
| U6 contrast below AA | major | 3756 | 1481 | -61 % |
| U7 fixed/sticky element covers a primary button | critical | 0 | 0 | — |
| U8 modal cannot reach its primary button | critical | 0 | 0 | — |
| U9 layout shift | minor | 122 | 119 | -2 % |
| U10 keyboard: primary unreachable or no focus ring | major | 0 | 0 | — |
| U11 DESIGN.md: blacklisted font or misplaced accent | minor | 400 | 403 | 1 % |
| U12 console error or failed request | major | 0 | 0 | — |

**Critical 56 → 0** (pages with a critical finding 7 → 0). **Major 20,506 →
13,707** (−33 %). Minor 522 → 522.

`uiux_findings` (critical + major, the ledger metric): **20,562 → 13,707**.

### Baseline, by check × viewport


| check | severity | phone-s | phone | phone-android | tablet | laptop | desktop | total |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| U1 horizontal scroll | critical | 12 | 8 | 2 | 0 | 0 | 0 | 22 |
| U2 interactive element off screen | critical | 16 | 14 | 4 | 0 | 0 | 0 | 34 |
| U3 tap target under 44×44 | major | 1390 | 1404 | 1418 | 0 | 0 | 0 | 4212 |
| U4 text too small | major | 2774 | 2768 | 2762 | 1416 | 1406 | 1406 | 12532 |
| U5 text clipped | major | 2 | 2 | 2 | 0 | 0 | 0 | 6 |
| U6 contrast below AA | major | 611 | 603 | 597 | 647 | 642 | 656 | 3756 |
| U7 fixed/sticky element covers a primary button | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U8 modal cannot reach its primary button | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U9 layout shift | minor | 1 | 1 | 1 | 77 | 8 | 34 | 122 |
| U10 keyboard: primary unreachable or no focus ring | major | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U11 DESIGN.md: blacklisted font or misplaced accent | minor | 68 | 67 | 66 | 66 | 66 | 67 | 400 |
| U12 console error or failed request | major | 0 | 0 | 0 | 0 | 0 | 0 | 0 |


### After, by check × viewport


| check | severity | phone-s | phone | phone-android | tablet | laptop | desktop | total |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| U1 horizontal scroll | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U2 interactive element off screen | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U3 tap target under 44×44 | major | 741 | 746 | 757 | 0 | 0 | 0 | 2244 |
| U4 text too small | major | 2342 | 2348 | 2342 | 990 | 980 | 980 | 9982 |
| U5 text clipped | major | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U6 contrast below AA | major | 230 | 225 | 232 | 262 | 266 | 266 | 1481 |
| U7 fixed/sticky element covers a primary button | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U8 modal cannot reach its primary button | critical | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U9 layout shift | minor | 0 | 1 | 0 | 77 | 9 | 32 | 119 |
| U10 keyboard: primary unreachable or no focus ring | major | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| U11 DESIGN.md: blacklisted font or misplaced accent | minor | 67 | 68 | 67 | 67 | 67 | 67 | 403 |
| U12 console error or failed request | major | 0 | 0 | 0 | 0 | 0 | 0 | 0 |


## Baseline findings by selector (all critical, top 25 major and minor)

| sev | check | selector | pages | runs | example |
|---|---|---|---:|---:|---|
| critical | U1 | `html` | 6 | 22 | document 389px wide at 375px (+14) |
| critical | U2 | `nav.nav a.bp` | 2 | 8 | left 231 right 388 at 375px |
| critical | U2 | `#root button.sq-feedback-fab.fixed` | 2 | 8 | left 352 right 396 at 375px |
| critical | U2 | `#root button.px-4.py-2` | 2 | 8 | left 291 right 391 at 375px |
| critical | U2 | `[data-testid="interview-window"] button.text-gray-400` | 1 | 6 | left 402 right 432 at 375px |
| critical | U2 | `nav.nav a.btn.bp` | 1 | 4 | left 324 right 401 at 375px |
| major | U4 | `footer.ft p` | 70 | 840 | 11px text |
| major | U6 | `footer.ft p` | 55 | 660 | 2.50:1 (needs 4.5:1) |
| major | U6 | `footer.ft a` | 55 | 660 | 2.50:1 (needs 4.5:1) |
| major | U4 | `p` | 66 | 636 | 13px body text on a phone |
| major | U4 | `#topic-cards p` | 33 | 396 | 13px body text on a phone |
| major | U4 | `#question-cards span` | 32 | 384 | 10px text |
| major | U4 | `#question-cards span.db.de` | 32 | 384 | 11px text |
| major | U4 | `#question-cards span.tt` | 32 | 384 | 11px text |
| major | U3 | `footer.ft a` | 60 | 360 | 44×17 |
| major | U4 | `#question-cards span.db.dm` | 30 | 360 | 11px text |
| major | U3 | `nav.nav a` | 59 | 354 | 37×36 |
| major | U3 | `#nav a` | 58 | 348 | 144×36 |
| major | U6 | `p` | 41 | 346 | 4.34:1 (needs 4.5:1) |
| major | U3 | `#nav a.btn.bp` | 57 | 342 | 155×38 |
| major | U3 | `a.btn.bo` | 47 | 273 | 127×42 |
| major | U6 | `#format-cards a` | 21 | 252 | 2.07:1 (needs 4.5:1) |
| major | U3 | `a` | 37 | 222 | 196×18 |
| major | U3 | `nav.nav a.bp` | 35 | 206 | 133×38 |
| major | U3 | `#related a` | 33 | 198 | 200×20 |
| major | U4 | `#topic-practice p` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#readiness p.sl` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#related p.sl` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#related p` | 33 | 198 | 12px body text on a phone |
| major | U4 | `#format a` | 12 | 144 | 11px text |
| major | U6 | `#format p` | 12 | 144 | 3.43:1 (needs 4.5:1) |
| minor | U11 | `#sq-quiz-root button.sqq-opt` | 21 | 252 | font arial |
| minor | U9 | `document` | 43 | 122 | CLS 0.209 on load |
| minor | U11 | `main.cm-main button.cm-start` | 4 | 48 | font arial |
| minor | U11 | `[data-testid="plan-annual"]` | 3 | 28 | accent as a border |
| minor | U11 | `#coach span.cm-dot` | 1 | 12 | accent as a background outside a CTA |
| minor | U11 | `aside.cm-radar-panel span.cm-dot-s` | 1 | 12 | accent as a background outside a CTA |
| minor | U11 | `#start-btn` | 1 | 12 | font arial |
| minor | U11 | `#share-cp` | 1 | 12 | font arial |
| minor | U11 | `#root div.bg-gray-900.border-2` | 1 | 12 | accent as a border |
| minor | U11 | `#root div.h-1\.5.rounded-full` | 1 | 12 | accent as a background outside a CTA |

## Root causes and the fix PRs

| PR | root cause | checks | moved |
|---|---|---|---|
| #143 | The mock cards on the Interview tab were one flex row that never wrapped: 37 px sideways at 375. A timed mock's "✕ Quit" sat past the window's overflow-hidden edge, the only way out. | U1 U2 U5 (critical) | app criticals 22 runs → 0 |
| #144 | Blog tables widened the page and pushed the nav CTA off screen. `/amazon-sql-interview/`'s `.tbl` had no CSS. `/sql-quiz/`'s nav kept its text links on a phone. | U1 U2 (critical) | marketing criticals 34 runs → 0 |
| #145 | The shared footer: the Datrick line at opacity .55 (2.50:1), `.flk` links 17 px tall, the © line 11 px. | U3 U4 U6 | footer findings 442 → 9 (375 + 1366, dark) |
| #146 | `.nl a{color}` outranked `.bp`, so the nav CTA was grey on its own button (2.00:1 on the yellow). Nav links were 32–38 px tall and `.btn.bo` 42 px. | U3 U6 | nav + outline findings 329 → 47 |
| #147 | Company question cards: pills 11 px, eyebrow 10 px, the format card's link in the brand colour (Stripe 2.07:1). | U4 U6 | card findings 300 → 0 |
| #149 | Tailwind `text-gray-500/600` on the app's dark surfaces (2.2–4.1:1), mapped to DESIGN.md's `--text-muted`. | U6 | app U6 1,044 → 468 |

Each PR has a guard test. Each test was proven by one deliberate break,
named in its commit.

## What is left (after all six)

| sev | check | selector | pages | runs | example |
|---|---|---|---:|---:|---|
| major | U4 | `p` | 66 | 636 | 13px body text on a phone |
| major | U4 | `#topic-cards p` | 33 | 396 | 13px body text on a phone |
| major | U6 | `p` | 41 | 365 | 3.81:1 (needs 4.5:1) |
| major | U3 | `a` | 37 | 222 | 196×18 |
| major | U3 | `#related a` | 33 | 198 | 200×20 |
| major | U4 | `#topic-practice p` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#readiness p.sl` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#related p.sl` | 33 | 198 | 13px body text on a phone |
| major | U4 | `#related p` | 33 | 198 | 12px body text on a phone |
| major | U6 | `a.btn.bo` | 37 | 148 | 4.39:1 (needs 4.5:1) |
| major | U4 | `#format a` | 12 | 144 | 11px text |
| major | U6 | `#format p` | 12 | 144 | 3.43:1 (needs 4.5:1) |
| major | U4 | `[data-testid="header-identity"] div.w-5.h-5` | 12 | 144 | 10px text |
| major | U4 | `#root span.rounded-full.border` | 12 | 144 | 10px text |
| major | U4 | `#root span.mt-0\.5.block` | 12 | 144 | 11px text |
| minor | U11 | `#sq-quiz-root button.sqq-opt` | 21 | 252 | font arial |
| minor | U9 | `document` | 42 | 119 | CLS 0.206 on load |
| minor | U11 | `main.cm-main button.cm-start` | 4 | 48 | font arial |
| minor | U11 | `[data-testid="plan-annual"]` | 3 | 31 | accent as a border |
| minor | U11 | `#coach span.cm-dot` | 1 | 12 | accent as a background outside a CTA |
| minor | U11 | `aside.cm-radar-panel span.cm-dot-s` | 1 | 12 | accent as a background outside a CTA |
| minor | U11 | `#start-btn` | 1 | 12 | font arial |
| minor | U11 | `#share-cp` | 1 | 12 | font arial |
| minor | U11 | `#root div.bg-gray-900.border-2` | 1 | 12 | accent as a border |
| minor | U11 | `#root div.h-1\.5.rounded-full` | 1 | 12 | accent as a background outside a CTA |

Why each was not fixed this run (the brief's limit is 6 fix PRs):
- **U4 "13 px body text on a phone"** (`p`, `#topic-cards p`, `#related p`;
  ~66 pages): the marketing body size is 13–15 px across hand-written pages
  and generators. Raising it to 14 px on phones is a sitewide type change, so
  it is listed for the founder.
- **U3 inline-ish links** (`a` 18–20 px tall in lists, `#related a`,
  `a.practice-link` 35 px): link lists, not running text. 44 px rows
  roughly double their height. That is a layout decision.
- **App header** (`header-row` Log in 30 px, `header-identity` 34 px,
  `header-pro` 28 px, `streak-chip` 16 px): 44 px boxes need a header
  redesign. #135 just set this row, so it is listed for the founder.
- **U6 `p` 3.81:1 and `#format p` 3.43:1** (company pages, translucent
  cards) and `a.btn.bo` 4.39:1: these need colour decisions.
- **U9 CLS 0.21 on load** (42 pages, mostly tablet): a web font swap on
  the hero. Minor.
- **U11 minor:**
  - `/sql-quiz/` option buttons render Arial: `<button>` does not inherit `font-family`.
  - The Pro modal's annual card has an accent border, against DESIGN.md's accent rule.
  - The coach mock's dots use the accent as a background.
- **Pages with no source:** `/privacy/`, `/terms/`, `/refund/` exist only in
  `public/`.
- **Drifting generator:** `/finans-sql/`, `/gayrimenkul-sql/`, `/uretim-sql/`
  come from `scripts/build-sector-landings.js`, whose output already differs
  from the committed pages on main. They were not regenerated.

#134 (the Chime page) merged during this run, after both audits. Each fix PR
was merged with the new main and rebuilt. `/chime-sql-interview/` carries the
footer, nav and card fixes through the same source rewrite, and the guards
cover it. Its own audit numbers arrive with the next weekly run. #135 and #136
(the phone header's Try Pro button, the footer link row) were already merged
when the run started. #145 builds on #136's footer.

## FOUNDER

1. **Marketing `.bp` buttons are a purple→pink gradient.** DESIGN.md says the
   primary CTA is the accent yellow and "no button gradients". The company
   generator pages already use yellow; the ~60 hand-written pages do not.
   Which one is the rule?
2. **The annual plan card's yellow border** (`plan-annual`, Pro modal):
   DESIGN.md forbids the accent on borders. It was a deliberate highlight, so
   keep it or swap it?
3. **Phone body text 13 → 14 px** on marketing pages (U4, ~66 pages).
4. **App header tap targets** (U3 on every app screen): a 44 px header row
   needs a design pass.
5. **Colour calls the audit cannot make:**
   - `.btn.bo` purple text on cards (3.1–4.4:1);
   - the orange "All" filter pill (`#F2F0EA` on `#F97316`, 2.46:1);
   - text inside the `opacity-70` locked rows.
6. **Blocking:** `SMOKE_UIUX=1` (U1 U2 U7 U8 on three surfaces) is advisory.
   Make it blocking after a week of clean runs?

## Reproduce

```
npm run build && npx serve public -l 4321
npm run uiux -- --base http://localhost:4321 --repo-report   # ~10 min, writes uiux-out/
```
