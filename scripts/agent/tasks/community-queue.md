<!-- allowed-paths: docs/reads/ -->

You are running unattended on a schedule. Find this week's public threads
where someone asks where or how to practise SQL, and draft — never post —
the reply the founder would write.

**You may only create or edit files under `docs/reads/`. Touch nothing else.**
No app code, no pages, no config. Line 1 is enforced: `run.sh` exports it and
`guard.sh` fails the run on any file outside `docs/reads/`.

**You NEVER post, comment, upvote, message or create an account anywhere.**
Not with a reason, not "just this once". Three reasons, each of which has
cost real products their standing:

1. **Self-promo removals poison the well.** A founder comment that a
   moderator removes leaves the account flagged and the domain on the sub's
   filter — every later organic mention of the site by a real user is then
   quietly removed too. One automated reply can shut a subreddit for good.
2. **The engines cite organic threads.** The `ai-visibility` read's
   third-party table shows where the answer engines pull from: reddit,
   alternativeto, quora, blogs. A thread where a real person answered a real
   question is what gets cited; a thread that reads as marketing does not.
3. **The hand-written reply is the whole advantage.** At this size the
   founder can read the thread, answer the actual question and say "I build
   this" in his own words. A company cannot. The same reasoning as
   `outreach-queue`: automation produces the queue and the context; a human
   writes the words and presses the button.

## Why this task exists

Measured 2026-09-06: the AI-assistant recommendation channel is the only
channel that has produced a paying user (payer #2, sent by Gemini for
"analytics prep"), and it is invisible to our tracking. What the engines
recommend, they learn from public threads where people compare practice
sites. This task is the supply side of that: find the threads while they
are live, and hand the founder a draft he can make his own.

## Sources — BROKEN as of 2026-09-07, read this before running

**The unauthenticated JSON endpoints this task was built on no longer work.**
Measured 2026-09-07 from a residential IP with the polite UA below:

| endpoint | result |
|---|---|
| `old.reddit.com/search.json` | 302 to a login interstitial, 0 bytes |
| `old.reddit.com/…` with a browser UA | 200, but an HTML "Welcome to Reddit" page, not JSON |
| `www.reddit.com/r/SQL/new.rss` | 200 once, then 429 on every retry |
| `www.reddit.com/r/SQL/search.rss` | 429 |

So a run today returns an empty queue for the wrong reason — not "no threads
worth answering" but "we cannot see the threads". An empty queue is supposed
to be a legitimate outcome of this task, which makes the failure invisible.
**Do not run this task until a source below is wired, and make the run FAIL
loudly rather than return an empty queue when every source errors.**

Options, in the order they should be tried:

1. **Reddit's official API with a registered app** — the only supported path.
   The founder registers a script app at `reddit.com/prefs/apps`, and the
   client id/secret go in the VPS `.env` (never the repo, like the other
   keys). Authenticated OAuth gets a real rate limit instead of a 429 on the
   second call. This is a founder action and it is the recommended fix.
2. **A search engine instead of Reddit** — `site:reddit.com/r/SQL "practice
   sql"` through Bing, which we already read for other things. Coarser and
   lagging, but needs no credentials.
3. **Manual** — the founder browses and pastes thread URLs; this task then
   only drafts. Worth keeping as the fallback, because the drafting is the
   part that takes time, not the finding.

The behavioural rules below are unchanged and still the point: answer real
questions, disclose being the builder, never drop a bare link, and one
automated reply can close a subreddit to us for good.

## Fit — what goes in the queue

**In:** someone asking where or how to practise SQL; which site to use;
whether X (DataLemur, StrataScratch, LeetCode, HackerRank, a course) is worth
paying for; how to prepare for the SQL round of an analyst / data science /
engineering interview; free resources to learn SQL by doing.

**Out:** help with a specific query or error; homework; job-market venting
with a SQL word in it; "is SQL still worth learning"; anything older than 7
days; threads that are locked, archived or removed; a sub whose rules ban
self-promotion outright unless the reply can stand with no link at all (it
usually can — say which). And every thread already listed in a prior
`docs/reads/community-*.md` — `grep -l` the URL before adding one; a thread
drafted twice is a thread posted twice.

Rank by recency first (a two-day-old thread is where the conversation still
is; a six-day-old one is over), then fit (the question is the site question,
not adjacent to it), then openness (a Reddit thread under ~25 comments is
still being read; one at 200 is not). **Max 5 threads.** An empty queue is a
successful run — do not lower the bar to fill it, and do not pad it with
adjacent threads.

## Per thread

One block each:

- **Link**, sub or site, posted (UTC), comment count at read time, and the
  sub's self-promotion rule in one line (read the sidebar; if it says
  "no self-promo", say so — the founder decides).
- **The question, in one line**, paraphrased. Do not quote the post at
  length: at most one short quoted phrase, in quotation marks.
- **Why this thread**: one line — what the asker is actually deciding.
- **DRAFT reply**, in the founder's outreach voice (the email-voice rule in
  `CLAUDE.md`, adapted to a public thread):
  - **Disclose in the first sentence** that he builds SQL Quest — "I build
    SQL Quest, so weigh this accordingly" — before any recommendation.
    Never after, never in a footnote.
  - **Answer the actual question first**, in the asker's frame. If they
    asked whether DataLemur premium is worth it, the answer is about
    DataLemur premium. If SQL Quest is not the right answer, the draft says
    so and the founder may post it anyway; that is what earns the next one.
  - **Name competitors fairly where they win**: DataLemur and StrataScratch
    on verified, company-sourced questions; LeetCode on breadth and the
    combined algorithm bank; HackerRank on being free and syntax-drill
    heavy. Real, checkable, one line each.
  - **One link at most, and only if it answers the question.** Never a bare
    link, never a link in a sentence that would read fine without it. No
    pitch, no "DM me", no follow-up, no hashtags, no sign-off block — it is
    a comment, written the way he types.
  - **Every number is computed from the bank at run time**, never typed from
    memory or copied from a page:

    ```bash
    node --input-type=module -e "globalThis.window={}; await import('./src/data/challenges.js');
      const c=window.challengesData; console.log(c.length, 'challenges;', c.filter(x=>x.freePreview).length, 'free Hard previews;',
      Object.entries(c.reduce((m,x)=>(m[x.difficulty]=(m[x.difficulty]||0)+1,m),{})).map(([k,v])=>k+' '+v).join(', '))"
    ```

    Pricing comes from the Pro modal in `src/app.jsx`, not from `CLAUDE.md`
    and not from a landing page — read it, then quote it. If you cannot
    compute a number, leave it out; a reply with no numbers is fine, a
    reply with a wrong one is a removal.
  - Match the thread's language. A Turkish thread gets a Turkish draft.

## Output

Write `docs/reads/community-YYYY-MM-DD.md`. Lead with the count and the
single best thread. At the top, the standing reminder, verbatim:

> The founder posts by hand, from his own account, after reading the sub's
> rules, and only the drafts he agrees with — rewriting is expected. At most
> one reply per sub per week. Log each posted reply as one line
> (`date · URL`) under a community claim in `docs/agent/ledger.md` — there
> is none yet; the first posted reply opens it, metric `ai_mention_share`
> and the cited-source table — so the `ai-visibility` read can later check
> whether the thread was cited.

Then the blocks. Then "what could not be read": every endpoint that refused,
every sub whose rules you could not fetch. If the queue is empty, say so in
five lines — a quiet week is the finding, not a failure.

Do not open a pull request yourself — the runner does that.
