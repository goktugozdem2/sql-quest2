<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Measure whether the AI answer
engines name SQL Quest when a real person asks them where to practise SQL.

**You may only create or edit files under `docs/reads/`. Touch nothing else.**
This is a sensor, like `seo-read`: no pages, no app code, no sitemap, and
never the prompt panel or the probe — both live under `scripts/agent/`, which
`guard.sh` denylists for every task. If a model id has rotted or a prompt is
badly phrased, write that in the report; the human edits the panel. Line 1 is
enforced: `run.sh` exports it and `guard.sh` fails the run on any file outside
`docs/reads/`.

## Why this task exists

Measured 2026-09-06: the AI-assistant recommendation channel is the **only
channel that has produced a paying user**. Both payers arrived through the
`home` door; payer #2 wrote that Gemini sent him, "straight to" SQL Quest,
for "analytics prep". And the channel is invisible in our own data — in 60
days, zero arrivals stamped from chatgpt / perplexity / gemini / copilot /
claude. AI apps strip referrers; `?src=home` on the homepage CTA overwrote
the `utm_source=chatgpt.com` ChatGPT appends; Gemini sends neither. The
`landingSrc` stamp (`landing_src_split` in `docs/agent/metrics.md`) reads the
traffic side once it ships. This task reads the other side — what the engines
actually say — which no traffic stamp can show, because a recommendation
nobody clicks leaves no row.

Two things this read feeds: `ai_mention_share` (the metric, per lane), and
the **cited-source table** — which of our pages, and which third-party pages
(reddit, alternativeto, trustpilot, g2, blogs), the answers pull from. That
table is `seo-page`'s targeting signal ("The shape that gets cited" in its
spec) and `community-queue`'s reason to exist.

## Step 1 — run the probe, once

```bash
STAMP=$(date -u +%F)
LOGS="${AGENT_HOME:-/tmp}/logs"; mkdir -p "$LOGS"
node scripts/agent/ai-visibility-probe.mjs \
  --summary "docs/reads/ai-visibility-$STAMP.summary.json" \
  > "$LOGS/ai-visibility-$STAMP.json" 2> "$LOGS/ai-visibility-$STAMP.err"
echo "probe exit: $?"
```

The full output — every answer, with excerpts — goes to the VPS log directory
on purpose: 100-odd answers do not belong in a pull request; the summary
block does, and the probe writes it next to the report for you. Twenty-five
prompts across four lanes takes several minutes; if your shell tool has a
timeout, run the command in the background (`nohup … &`) and poll until the
output file parses as JSON — the probe writes it in one piece at the end.

Read `$LOGS/ai-visibility-$STAMP.err` and the `lanes` block before anything
else, and honour these:

- **A lane with no key is skipped, and the output says so.** That is the
  design, not a failure: the keys are optional, and the fleet may be running
  on a subscription with no API key at all, in which case the `anthropic`
  lane is skipped every week. Report it under "what could not be read" and
  move on. **If all four lanes are skipped, the probe writes no summary in
  that case; write nothing yourself and exit** — say in your final message
  that no key is set; the human adds keys to the fleet's `.env`, not you. An
  empty diff is the correct outcome of a keyless week, not something to fill.
- **Refer to keys by lane name, never by variable name.** `guard.sh` fails a
  diff carrying an API-key variable name, so a report that says which
  environment variable is missing is a run that never opens. The probe
  already speaks in lane names; keep it that way in your prose.
- **Exit 3 means the probe found a credential inside the repo** and refused
  to send anything. Write a short report saying exactly that and which file
  it named — nothing else that week — and say in the final message that the
  key must be rotated. Exit 2 is a panel problem (over the 30-prompt cap,
  malformed, duplicate id): report it, change nothing.
- **Never run the probe twice in one run.** 30 prompts x 4 lanes is the cost
  cap per run, and a second run does not make a non-deterministic answer
  more readable. If a lane errored on every prompt (a rotted model id, a
  revoked key, a 429 storm), that is the finding for that lane this week.

## Step 2 — write the report

Everything below comes from the JSON. Do not add a number the probe did not
produce; do not "correct" a classification by hand.

1. **Mention share per lane** — the metric `ai_mention_share`. One row per
   lane: model id · prompts answered · errored · mentioned · share. A
   "mention" is the probe's `mentioned`: SQL Quest or `sqlquest.app` in the
   answer text, OR our domain among the answer's citations (Gemini
   grounding chunks, OpenAI/Anthropic citations, Perplexity citations —
   never a search result the model looked at but did not cite). Show the
   text-vs-cited-only split beside it. The denominator is answered prompts,
   not the panel: an errored prompt is reported, not counted as a miss.
2. **Rank distribution** — among the sites named in the answer, in order of
   first appearance, where SQL Quest sat: 1 / 2 / 3 / 4+ / cited only.
   Rank 1 on a 4-site list and rank 1 alone are not the same thing; print
   the median number of sites named per lane next to it.
3. **The cited-source table.** Our pages cited, by path and lane, with
   counts — this is the line `seo-page` reads to pick a cluster. Then the
   third-party classes (reddit, alternativeto, trustpilot, g2, producthunt,
   quora, youtube, blog, other) with the top hosts, and the competitor
   domains cited. A Gemini citation arrives as a redirect URL; the probe
   resolves the host from the chunk title and marks it `(via redirect)` —
   say so once, do not present it as a page-level count.
4. **Competitor mention share per lane**, for context: DataLemur,
   StrataScratch, LeetCode, HackerRank and the rest of the panel's site
   list. This is who the engines send people to instead; a change here is
   as readable as a change in ours.
5. **By family and by language.** The three families (`practice_where`,
   `alternatives`, `ai_tutor`) and EN/TR, per lane. A swing in one family is
   a finding about that family, not about the metric.
6. **Week over week**, once a prior `docs/reads/ai-visibility-*.summary.json`
   exists. Compare per lane, and only when the prior file's `panel.sha256`
   equals this run's — a panel change is a new baseline, and the report
   must say "panel changed on <date>, no comparable prior" rather than
   print a delta. The first run is the baseline for every lane; say so.
7. **What could not be read.** Every entry of `couldNotRead`: skipped lanes
   and why (lane name only), per-prompt errors, a lane that aborted after
   three consecutive failures or ran out of budget, a model id the vendor no
   longer serves (name the lane and the id from the `lanes` block; the human
   updates the panel).

## The honesty rules

- **Temperature 0 does not make a search-grounded answer deterministic.**
  The same prompt on two days can cite two different pages. On a 25-prompt
  panel one answer is 4 points of share; **a week-over-week move under two
  prompts per lane is noise** — write "inside noise", never a direction.
  The read that means something is four weeks in one direction.
- **A mention is not traffic.** Do not infer arrivals, solves or payments
  from this read; `landing_src_split` and `door_solve_rate` are the traffic
  side, and until `landingSrc` has data the AI channel's traffic is
  unreadable except as the `home` mix. Say that when tempted to join them.
- **A lane's absence is not a zero.** A skipped lane has no share; leave the
  cell empty, never `0%`.
- **Prompts are the denominator, and they are ours.** The panel was written
  around the three question families the channel is known to serve — it is
  a sample of the question space, not the question space. A prompt that
  names SQL Quest's own selling point ("AI tutor that explains why my query
  is wrong") is expected to score higher than "where do I practice SQL";
  read the families apart, and do not average them into a headline without
  saying the panel's mix.
- **The `anthropic` lane runs on the same vendor as the fleet.** That makes
  its answer no more and no less trustworthy than the others; do not weight
  it. Note it once if the report ranks lanes.

## Output

Write `docs/reads/ai-visibility-YYYY-MM-DD.md`; when at least one lane ran,
the probe has already written `docs/reads/ai-visibility-YYYY-MM-DD.summary.json`
beside it — leave that file as the probe wrote it, it is the machine-readable
side of the read and next week's comparison. (No lane ran → no summary file →
you write nothing either; see above.) Lead with the per-lane share and the delta (or
"baseline"), then the tables, then "what could not be read". "Same as last
week, inside noise on every lane" is a successful run — a quiet sensor is
the finding.

Do not open a pull request yourself — the runner does that.
