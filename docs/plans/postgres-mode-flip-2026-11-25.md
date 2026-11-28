# PostgreSQL mode — the flip (2026-11-25)

Flag `postgresMode`, still **false** after this PR. Spike, numbers and coverage:
[postgres-mode-2026-11-22.md](postgres-mode-2026-11-22.md),
[postgres-mode-coverage-2026-11-22.md](postgres-mode-coverage-2026-11-22.md).
Metric: `postgres_mode_use` (docs/agent/metrics.md). Ledger: "PostgreSQL mode —
the opt-in switch".

## The shape: an opt-in switch, default unchanged

"Engine: SQLite | PostgreSQL" above the editor, on desktop, on every
challenge. SQLite stays the default for everyone. A challenge off the
allow-list says "PostgreSQL mode not available for this one yet". The verdict
on PostgreSQL is shown and never recorded (no solve, attempt, XP or quota).

**Why opt-in, not an A/B default.**
- An A/B with PostgreSQL as the default would put a 5.4 MB download and a
  0.6 GB instance in front of a first-run person who never asked for it. That
  person decides `first_solve_10m` and `open_to_first_run`. The opt-in costs
  nothing until it is picked: app.js +0.5 KB gzipped, 0 bytes of PGlite.
- An A/B needs a cell. Open → first run on phones is full (`companyDirectOpen`
  + `mobileRunBar`, orchestrator decision 2026-11-24), and the desktop cell
  carries `companyDirectOpen`. An opt-in switch is not an A/B and takes no
  cell. Its guardrail is a before/after read, stated as confounded.
- The spike's plan argued for Pro-only on cost, not on data. With an opt-in
  the cost lands only on people who pick it, so that argument goes away. The
  plan has no data on demand, and there are no events yet to give any.

**Why not Pro-only (yet).** A Pro gate changes what a paid plan contains, so it
is a money flag that needs the founder's go. Active Pro subscribers number in
single digits, so a Pro-only read would have no sample. That is the same
reasoning as the Debug set's 11-23 decision row. The switch sits on the
challenge page, behind the gates that already exist: the 10-solve quota wall
and Hard for Pro. It opens nothing a person could not already open. Revisit a
Pro gate after the 28-day read, with the founder.

**Who sees it** (`pgModeFits`, `src/utils/postgres-mode-gate.js`):
- 768 px wide or more;
- a fine pointer (mouse or trackpad). A touch-first device such as an iPad is
  wide, but it has a phone's tab memory limits, and Safari reports no
  `deviceMemory`;
- and no reported `navigator.deviceMemory` under 4 GB.

Phones and tablets wait for a real-device memory read. A Simulator runs on
the Mac's memory and cannot give that read.

## Readiness, measured 2026-11-25

macOS, Playwright Chromium 145 headless. PGlite was served from
`node_modules`, which are the pinned npm bytes jsDelivr serves, so the SRI
check ran on all four files. Two runs each.

| Number | Value |
|---|---|
| app.js, flag off or on | 406,504 → 406,993 B gzipped (+489 B: the gate + events); size-limit 408.3 / 418.6 kB |
| `/pg-mode.js` (on pick) | 20,146 B raw, 7,916 B gzipped (was 19,326 / 7,582) |
| PGlite (on pick, once per page load) | 5.38 MB gzipped, unchanged |
| Cold start, bytes local, desktop CPU | 0.9 s (fetch + compile 0.14–0.20 s, boot 0.56–0.70 s, tables 2–3 ms) |
| Cold start, phone-class CPU (4× / 6× throttle) | 2.6 s / 3.8 s, plus the network: +0.9 s at 50 Mbps, +4.3 s at 10 Mbps (computed) |
| Pick → "ready" in the app (fresh page, 1366) | 657–861 ms |
| Challenge switch | **2–47 ms** (was 429–490 ms with an instance per challenge); 190–268 ms at 4–6× CPU |
| Query / Submit | 1–3 ms / 30–42 ms |
| Renderer RSS, base page | 117–118 MB |
| Renderer RSS, after 5 switches | 573–762 MB (one instance, `instancesCreated` 1) |
| Renderer RSS, **peak** over the walk (100 ms samples) | **739–762 MB** (the old engine: 802–1,010 MB) |

**The spike's drop rule, read honestly.** It said: "if one PGlite instance per
session cannot hold a 375-wide Chromium under ~700 MB renderer RSS after five
switches, drop the feature". The one-instance session removes the growth from
switching (peak −60 to −250 MB, 10–20× faster switches). The instance itself
still costs about 600 MB, and the peak lands **5–9% over the line** on this
read. That cost is PGlite's own: the WASM heap is 189 MB, the rest is compiled
code and the in-memory file system. It cannot be trimmed from our side.

The rule was written for phones, where iOS Safari kills tabs at about
1–1.5 GB. This shape keeps phones and touch tablets off. On a desktop with
4 GB or more, a 750 MB renderer is ordinary. **Decision for A0/the founder:**
accept the desktop shape under a desktop rule (below), and keep the 700 MB
line as the gate for any phone or tablet release. The other options are to
drop it, as the rule literally reads, or to wait for a smaller PGlite build.

## What this PR changed (flag still off)

1. **One PGlite instance per session** (`src/pg-mode/session.js`). Each
   challenge gets its own schema `c<id>`, the previous one is dropped, and
   the search_path is reset before every run. All statements are queued, so
   a switch never drops a schema under a running Submit.
2. **The gate.** `pgModeFits` is folded into `postgresModeOn`, so the toggle,
   the challenge-change effect, Run and Submit all share it.
3. **Events.** `postgres_mode_toggle_shown`, `_picked`, `_ready`
   `{loadMs, cold}`, `_unavailable`, `_failed` `{error: short reason}`,
   `_submitted` `{verdict}`, `_left`. None of them is a `challenge_` event.
4. **Metric** `postgres_mode_use` and its ledger claim.
5. **Scripts.**
   - `measure-memory.mjs` sums only Playwright's Chromium (it summed the
     desktop Chrome too on macOS), walks 375×812, records the peak, and makes
     five switches.
   - `headless-check.mjs` expects no switch at 375, and runs against the real
     CDNs when there is no vendor dir.

Guards: `tests/postgres-mode-ready.test.js` (15 tests). Each was proven by a
deliberate break, listed in the commit.

## The walk — before the flip

Production after the merge and deploy, with the flag overridden
(`/app/?ff_features_postgresMode=true`). Nothing has reached the real jsDelivr
yet. Every session so far served the bytes from disk. So item 1 is the first
real fetch.

**Desktop (required, all must pass):**
1. Chrome, macOS, 1366+ wide. Pick PostgreSQL on challenge 99, then check:
   - the Network tab shows four PGlite requests to
     `cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.15/dist/`, each 200, with
     no SRI or CORS error in the console;
   - the status shows "PostgreSQL 18 ready";
   - a Postgres-native answer is Correct (`to_char`, `EXTRACT`), and a
     `strftime` query errors the Postgres way;
   - a wrong answer is "Not the expected rows".
2. Same tab: open 118, 110 and 300, then back to 99. Each switch is ready in
   under 0.5 s, and Chrome's Task Manager shows the tab under ~900 MB.
3. Challenge 150 shows "not available for this one yet", and nothing new is
   fetched.
4. Switch back to SQLite. Run and Submit grade on SQLite as before, and a
   correct Submit records the solve as usual.
5. A free guest at 10/10 solves meets the quota wall on an unsolved challenge
   whether or not PostgreSQL is picked. The switch opens nothing new.
6. Safari and Firefox, macOS: steps 1 and 3. The switch shows, because
   neither reports `deviceMemory`.
7. Window narrowed to under 768 px: the switch is gone, and Run and Submit
   use SQLite.
8. `node scripts/pg/headless-check.mjs https://sqlquest.app` (no
   PG_VENDOR_DIR, so the real CDNs are used): PASS.
9. The production smoke (`SMOKE_HERMETIC=1 node scripts/smoke-test.js
   https://sqlquest.app`) is green with the flag off.

**iOS Simulator (required, a negative check):**
10. iPhone (e.g. 16e), Safari, `/app/?challenge=99&ff_features_postgresMode=true`:
    no switch, and no request for `/pg-mode.js` (Web Inspector → Network).
11. iPad (any size), Safari, the same URL: no switch (coarse pointer), and no
    request. The iPad must also not show it in landscape at 1180+ px.

**Not walkable here, and so not offered.** Real-device memory on iPhone, iPad
and a mid-range Android. That read is the gate for a later phone or tablet
release, under the 700 MB line.

## The flip

- **What:** `postgresMode: true` in `src/data/feature-flags.js`, in its own
  PR, with its own orchestrator decision row. One flip a day, so the read has
  its own t0.
- **Not a money flag.** There is no Pro gate and no price; free and Pro get
  the same switch. **Not an A/B**, so it takes no step × device cell.
- **When:** after this PR merges and deploys, the walk above passes, and A0
  (or the founder) accepts the desktop rule. Do not flip on a day another
  flip lands on the desktop open → first run or first run → solve cells.
- **Read:** t0 + 28 days, `postgres_mode_use`.

## The revert rule (written before the data)

Turn the flag off **the same day** if any of these happens:
- more than 10% of pickers get only `postgres_mode_failed`, with no
  `postgres_mode_ready`, once there are 10 or more pickers;
- 3 or more people get `postgres_mode_failed` with `error = 'memory'`, or
  anyone reports a tab crash or a frozen page with PostgreSQL picked
  (`feedback`, A3's error read);
- a `mobile:` viewport or a coarse-pointer device appears on any
  `postgres_mode_*` row (the gate leaked);
- a SQLite solve is lost or wrongly graded after switching back, which is
  the walk's step 4 in the wild.

Turning it off ships nothing new and removes nothing: the switch disappears,
and the 0-byte flag-off path is the one we have today.

**At the 28-day read:** the target and the falsification are in the ledger
claim. Below 100 shown people the read is `UNREADABLE`, not `FLAT`.

## Not done, on purpose

- **The 21 challenges off the list** (302 of 323 are on it):
  - **10 state-graded DDL/DML** (325–329, 355–359). The bank runner treats a
    reference as a SELECT. They need a state-grade path on PGlite; that is a
    feature, not a rewrite.
  - **6 nondeterministic references** (67, 69, 239, 247, 250, 262). A tie
    under `LIMIT` that the SQLite answer breaks by row order. 239 also unions
    a DATE with TEXT on Postgres. Fixable: add a tiebreaker to the reference
    (and a cast on 239).
  - **3 ties broken differently** (71, 150, 230), with no tiebreaker in the
    reference. Fixable the same way.
  - **2 `HAVING alias`** (20, 263), which Postgres refuses. Fixable: repeat
    the aggregate in HAVING.

  All 11 fixable ones change the SQLite reference too, so they are a content
  PR through Q1, with `node scripts/pg/build-allowlist.mjs` re-run in it, and
  not this PR's work.
- The Expected Output panel still shows SQLite's rows, and the tutor, hints
  and dialect notes do not know the engine.
- Recording PostgreSQL solves (XP, `solvedChallenges`, quota) is a separate
  decision.
- A person's own `COMMIT` inside a script ends the rollback early. Their
  changes then stay in that challenge's schema until they switch challenge.
  This was true of the spike too, and it touches only their own copy of the
  data.
