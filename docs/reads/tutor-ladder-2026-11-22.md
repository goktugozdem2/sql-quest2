# Tutor ladder — who bypasses, and does it cost the solve? (read 2026-11-22)

For BACKLOG idea 6 ("Tutor ladder: bypass at 52%"): should the inline Help
panel open on rung 2 (the clause) for people who bypassed before? Pre-set
build rule: build only if repeat bypassers number at least ~30 people in 30
days **and** the solve rate after a bypass is clearly worse than after the
ladder. **Neither holds. Not built.**

## Window and filters

- 2026-10-23 → 2026-11-22 (30 days), `pro_events` + `tutor_events`, read-only.
- Bots and internal accounts out: `metadata.bot`, viewports `tablet:800x600`,
  `desktop:1280x1200`, `desktop:1919x992`, `ref:aocr.org`, usernames matching
  `^(test|qa_|fabletest|linktest|internalroutine|sqlquest$)`. Person =
  `coalesce(metadata.aid, username)`.

## What records the ladder (from the code)

- `inline_help_opened {challengeId, opener: diagnosis|query|empty}` — the
  Help open (`openInlineAiHelp`, src/app.jsx).
- `tutor_bypass_clicked {challengeId}` — the "Show me the answer" button
  (`data-testid="tutor-bypass"`). Asking for the answer in words also
  bypasses inside the prompt but fires no event; it is not counted here.
- **No event records a rung.** The rung is inferred from `tutor_events`
  (`phase='feedback'`, same username + challenge_id, within 60 min of the
  open): the silent opener (`inlineOpenerMessage`, rung 1) and the bypass
  text are recognised by their fixed wording; any other question is a typed
  follow-up, read here as "went past rung 1".
- Solve = `challenge_solved` on the same challenge by the same person within
  60 min of the open.

## Numbers

| | value |
|---|---|
| Help opens | **209** (80 people; 182 person-challenges) |
| Opens followed by a bypass click within 60 min | **112 / 209 (54%)**, 48 people |
| Time from open to bypass (person-challenge) | p25 **7 s**, median **29 s**, p75 **97 s**; 50.5% inside 30 s |
| …by opener | `query` (no diagnosis, no silent rung 1): median 14 s · `diagnosis`: median 61 s |
| Bypass → solve (median) | 104 s |

Solve within 60 min, per Help open:

| group | opens | people | solved ≤ 60 min |
|---|---|---|---|
| bypassed | 112 | 48 | **72.3%** (81) |
| stayed on rung 1 (no follow-up) | 43 | 33 | **60.5%** (26) |
| typed a follow-up (rung 2+) | 54 | 18 | **66.7%** (36) |
| all | 209 | 80 | 68.4% (143) |

Per person-challenge (first open): bypassed 71.7% (n 99) vs not 68.7% (n 83).

Repeat bypassing — the population the idea targets:

| | people |
|---|---|
| bypassed on ≥ 1 challenge | 49 |
| bypassed on ≥ 2 challenges | **21** |
| bypassed on ≥ 3 challenges | 12 |
| bypassers who opened Help on a later challenge | 24 |
| …and bypassed again there | **21 of 24 (88%)** |

On the challenges after a person's first bypass: 68 person-challenges, 50
bypassed (74%); solve within 60 min 73.5% overall, 70.0% where they bypassed.

## Decision: do not build

1. **The population is too small.** 21 people bypassed on two or more
   challenges in 30 days (the rule asked for ~30). An A/B split of 21 people
   gives ~10 per arm; no read at 12-20 could tell an effect from noise.
2. **The bypass does not cost the solve.** Bypassers solve the challenge
   within the hour at 72.3%, above rung-1-only (60.5%) and rung 2+ (66.7%).
   Part of that is pasting the answer (bypass → solve in a median 104 s), so
   "solved" after a bypass measures completion, not learning — but the idea's
   premise was that the bypass loses the solve, and it does not.
3. **The habit is real.** 88% of bypassers who open Help again bypass again,
   and half of all bypasses come inside 30 s. That says the rung-2 opener would
   reach the right people; it does not change (1) or (2).

## One finding worth its own look (not built here)

The inline panel's rung count misses the silent opener. `hintRequestNumber`
counts the visible user messages in `inlineAiMessages`; the automatic first
ask (`sendInlineAiMessage(…, { silent: true })`) is never added there. So after
a diagnosis opener, a person's **first typed follow-up is sent as request 1
again** — rung 1 twice — and the clause (rung 2) only comes on the second
typed question. Fixing the count (no prompt change, no extra calls) is a
smaller, everyone-wide change than an A/B on 21 people, and may itself lower
the bypass. It needs its own claim; read `tutor_ladder` before and after.

## Re-read

Re-read at 2026-12-20 only if repeat bypassers reach ~30 in a 30-day window,
or if the counting fix above ships (then read bypass rate and rung-2 reach
pre/post).
