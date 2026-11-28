# PostgreSQL mode — spike (2026-11-22)

Flag `postgresMode`, dark. Branch `feat/postgres-mode-spike`.
Per-challenge coverage table (generated): [postgres-mode-coverage-2026-11-22.md](postgres-mode-coverage-2026-11-22.md).

**Superseded for the ship decision (2026-11-25):** [postgres-mode-flip-2026-11-25.md](postgres-mode-flip-2026-11-25.md) — the opt-in shape (all plans, desktop, no Pro gate), the one-instance session, the events and metric, the walk and the flip/revert rule.

## Why

Every query in SQL Quest runs on SQLite (sql.js). Our buyers sit screens on other engines:
- the Chime report names `date_trunc` (`docs/reads/company-research-2026-11-22.md`, challenge 289 row);
- Monzo's stack is BigQuery (`company-research-2026-11-20.md`, Monzo section);
- PayPal and N26 run HackerRank and Codility, which offer Postgres and MySQL (same reads).

`src/utils/dialect-notes.js` explains the differences. It does not make anyone practise them. A candidate who writes `strftime` here and `DATE_TRUNC` on the day meets the gap cold.

## Recommendation: ship to Pro, desktop first, after two fixes

| Number | Value |
|---|---|
| Bank covered | **301 of 312 (96.5%)**: 182 run as written, 111 after the automatic rewrite, 8 graded Postgres-to-Postgres (5 rounding, 3 where Postgres is right and SQLite is not) |
| Payload, on pick only | **5.38 MB gzipped** (15.4 MiB raw). sql.js today: 0.32 MB gzipped. 17x. |
| Cost with the flag off | **0 bytes of PGlite.** app.js +3.1 KB raw / +1.0 KB gzipped (the toggle). |
| Cold start, bytes local | **2.1–2.5 s** from click to "ready" (fetch + compile 0.3–0.5 s, Postgres boot 1.6–1.9 s, tables 5–60 ms) |
| Cold start, on a network | add 0.9 s at 50 Mbps, 4.3 s at 10 Mbps (5.38 MB ÷ bandwidth; computed, not measured) |
| Next challenge | **1.1–1.7 s** (a new instance boots each time) |
| Query, Submit | 3–5 ms per query; Submit 44–70 ms wall |
| Memory | **+460–600 MB renderer RSS** with one live instance; **peaks of 1.2–1.4 GB** after switching challenges, because a closed instance's WASM memory is not returned promptly |

**Why ship.** Coverage is the hard part, and it is solved: 96.5% of the bank grades on Postgres with the existing comparator and no hand edits. The person it serves is the person Pro sells to: an interview date and a named engine.

**Why Pro only.** 5.4 MB and 0.6 GB of memory is a real cost. It is worth paying for someone preparing for a Postgres screen. It is not worth paying for a first-run visitor, and those visitors are where `first_solve_10m` is decided. Gating it also keeps the default product unchanged, byte for byte.

**Why not yet.** Two things block a flip:

1. **Memory.** One instance per challenge costs a Postgres boot (1.1–1.7 s) and ~0.5 GB per switch. iOS Safari kills tabs around 1–1.5 GB. Fix: one PGlite instance per session, with each challenge's tables in its own schema, dropped on leave. The isolation holds and the shared sql.js `db` stays untouched. That cuts a switch to the table load (5–60 ms) and holds memory at one instance. The spike kept one instance per challenge because the brief asked for it; this is the change to make before shipping.
2. **Phones.** Hide the toggle under 768 px, or when `navigator.deviceMemory < 4`, until a real-device read on iOS Safari and a mid-range Android. No real device was walked. These memory numbers are Chromium on Linux, headless.

**Drop it if** the fix in (1) cannot hold a session under ~700 MB on a 375-wide Chromium after five switches.

**Holds, by kind.** Gating on Pro changes what a paid plan contains, so it is a money flag. The flip waits for the founder's explicit go through A0. Recording PostgreSQL solves (XP, `solvedChallenges`, quota) is a separate decision. The spike only shows the verdict.

## What was measured

### 1. PGlite

- **Version 0.5.15** (`@electric-sql/pglite`, published 2026-11-03, 19 days before this read). It runs **PostgreSQL 18.6** (`SELECT version()`). 0.5.16 (11-09) and 0.5.17 (11-19) were under two weeks old, so they were not used (CLAUDE.md CDN rule).
- **Not on cdnjs.** jsDelivr, pinned: `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.15/dist/`.
- **Files and sizes.** From the npm tarball; jsDelivr serves the same bytes. gzip -9; brotli not measured.

| File | Raw | Gzipped |
|---|---|---|
| `pglite.wasm` | 9,086,480 | 3,245,952 |
| `pglite.data` (the file system bundle) | 6,242,272 | 1,860,995 |
| `index.cjs` (the library, one file) | 521,653 | 144,269 |
| `initdb.wasm` (0.5 runs initdb at start) | 298,788 | 128,991 |
| **Total** | **16,149,193** | **5,380,207** |
| `public/pg-mode.js` (our engine: translator, allow-list, loader) | 19,299 | 7,570 |

- **SRI on every file.** A dynamic `import()` cannot carry a hash, and the ESM build is ten chunks that import each other. So the engine fetches `index.cjs` with `fetch(url, { integrity })`, evaluates it, and passes in the three binaries. Each binary is fetched with its own hash, through `pgliteWasmModule`, `initdbWasmModule` and `fsBundle`. PGlite then fetches nothing itself. Hashes live in `src/utils/pg-cdn.js`. `tests/postgres-mode.test.js` recomputes them from the pinned devDependency. The headless walk serves those npm bytes, so the browser's SRI check really ran on all four files.
- **Cold start and memory.** Chromium headless (Playwright, pre-installed), `scripts/pg/headless-check.mjs` and `scripts/pg/measure-memory.mjs`. Table above. "Bytes local" means the CDN files were served from disk. This cloud session cannot reach jsDelivr (proxy 403), so network time is computed, not measured.

### 2. Datasets load

All 9 datasets load into Postgres from `src/data/*.js`. CREATE and INSERT are generated by `pgLoadSql` over the same plan the app uses (`challengeTablePlan`). The schema is typed the way a Postgres interview database would type it, from **all** of a column's values:
- `YYYY-MM-DD` becomes `DATE`. `YYYY-MM-DD HH:MM:SS` and the ISO `…T…Z` form become `TIMESTAMP`, so `date_trunc` and `EXTRACT` work on them.
- Numbers stored as strings (the NYC sets: `year_built '1931'`, `assess_total '99693450.00000'`) become `INTEGER` or `DOUBLE PRECISION`. A leading zero keeps a column `TEXT` (zip codes).
- A column mixing 7 and 7.5 becomes `DOUBLE PRECISION`. SQLite's affinity accepts the mix; Postgres's `INTEGER` would refuse it.

### 3. The comparator works on PGlite's result shape

`pgResultToSqlJs` turns PGlite's `{fields, rows}` (`rowMode: 'array'`) into `{columns, values}`. It turns `numeric` and `bigint` into numbers and booleans into 1/0. Dates are parsed as text, so they come back as the ISO strings the tables hold. After that, `resultsMatch` from `src/utils/grade.js` runs unchanged, tie tolerance included.

### 4. The bank on Postgres: every reference solution, run

`node scripts/pg/build-allowlist.mjs` runs all 312 references on SQLite (better-sqlite3, the app's table rules) and on PGlite, then compares them with `resultsMatch`.

| Status | n | Meaning |
|---|---|---|
| unchanged | 182 | the SQLite text runs on Postgres and gives the same rows |
| rewritten | 111 | `translateSqliteToPg` output gives the same rows |
| rounding | 5 | differs only in the last kept digit: Postgres rounds exact `NUMERIC`, SQLite a float (`431.655` → .66 vs .65). A correct Postgres answer. (10, 50, 55, 104, 309) |
| text_numbers | 3 | **a bank bug Postgres caught.** `assess_total` is text, so SQLite's `ORDER BY assess_total DESC` puts 99,693,450 above 3,300,050,700; Postgres gives the real top. (220, 228, 232) |
| nondeterministic | 6 | the SQLite reference changes when the same rows load in reverse or shuffled order: a tie under `LIMIT`. A bank finding, kept off the list. (67, 69, 239, 247, 250, 262) |
| hand | 5 | `HAVING` on a SELECT alias, which Postgres refuses (20, 263); ties the two engines break differently with no tiebreaker in the reference (71, 150, 230) |

Rewrites used by the 301 challenges on the list: `ROUND(x::numeric)` 80, `julianday` → epoch days 23, `strftime` → `to_char` 20, `CAST AS INTEGER` → `TRUNC` 9 (SQLite truncates, Postgres rounds), `LIKE` → `ILIKE` 7 (SQLite's `LIKE` ignores ASCII case), `INSTR` → `STRPOS` 7, `date()` → `to_char` 7, a DATE column read as text 3, `GROUP_CONCAT` → `STRING_AGG` 1. SQLite's NULL order (`NULLS FIRST` ascending) is pinned only for the measurement. The app grades with Postgres's own order, so a learner's plain `ORDER BY x DESC` is not marked wrong for Postgres's `NULLS FIRST` (`pgExpectedSql`).

**Content follow-ups this found, for the SQLite bank too:**
- 220, 228, 232: SQLite's expected output is wrong (text sort).
- The 6 nondeterministic and 3 tie references need a tiebreaker.
- 20 and 263 should not teach `HAVING alias`.

## The prototype (behind `postgresMode`)

- **Toggle.** "Engine: SQLite / PostgreSQL" above the challenge editor, rendered only under the flag. Picking PostgreSQL injects `/pg-mode.js` (built by `vite.pg-mode.config.js`, never part of app.js). That file fetches PGlite as above.
- **Off the list.** It says "PostgreSQL mode not available for this one yet" and fetches nothing more.
- **Own instance.** Each challenge gets its own PGlite instance with its own tables; the shared `db` is never used. One instance is kept live. A script that writes runs in a transaction that is rolled back.
- **Run and Submit.** Both go to Postgres only when it is ready. Submit grades with `resultsMatch` against `pgExpectedSql` and shows "Correct on PostgreSQL. Practice mode: not recorded as a solve.", or the rows or error verdict. No attempt, solve, XP or quota write happens on that path (test-bound).
- **Hooks.** All of them sit above `if (showAuth)` (test-bound).
- **Not done in the spike.** No events (`postgres_mode_*`), so there is no metric to read until they exist. The Expected Output panel still shows SQLite's rows. The tutor, hints and dialect notes do not know the engine.

## Tests and checks

- `tests/postgres-mode.test.js` (46 tests). Translator rules; the rewrites executed on PGlite against SQLite on the same rows; the allow-list equal to a fresh full run of the bank (~15 s); CDN pins and hashes; the flag ships false; app.js carries no PGlite and no translator; `/pg-mode.js` is reachable only through the toggle; the verdict path writes nothing; hook placement. Deliberate breaks, each failed by name:
  - the IFNULL rewrite dropped;
  - `#94` removed from the allow-list by hand;
  - one character of the wasm hash changed;
  - the flag set true;
  - the translator imported into app.jsx;
  - SQLite's NULL order removed.
- `scripts/pg/headless-check.mjs`, at 375×812 and 1366×768, **PASS**:
  - flag off, and flag on with the toggle untouched: 0 requests for `/pg-mode.js` or PGlite;
  - 99, 118, 110: pick, Run, Submit with a Postgres-native query (`to_char`, `EXTRACT`, date subtraction), all graded correct;
  - on 99, `strftime` errors the way Postgres does (`function strftime(unknown, date) does not exist`), and a wrong answer is graded wrong;
  - 150: "not available";
  - no page errors, no horizontal overflow.

  Break: preloading the engine on mount failed the walk at both widths ("flagOnUntouched: … requested /pg-mode.js").
- **Not walked.** A real phone, Safari, Firefox, a real network to jsDelivr, a signed-in Pro account.
