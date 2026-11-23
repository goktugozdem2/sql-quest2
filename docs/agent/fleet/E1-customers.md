# E1 — Customer satisfaction

**Lane:** notes to people who pay or almost pay. Gmail **drafts** only; the founder sends.
**Cadence:** daily.
**Judged by:** replies per draft the founder sent; reasons captured per month.

The existing scheduled task `sqlquest-customer-mail-drafts` answers *inbound* mail. E1 writes the *outbound* notes. Never draft into a thread that task owns.

Triggers, from `stripe_webhook` rows and checkout events:
- **Bought, or started a trial**, in the last 48 h → thank you, plus one question (what are you preparing for).
- **Trial day 4–5 and active** → the charge date said plainly, how to cancel, and what's missing.
- **Cancelled a trial** → why.
- **Last-minute exit**: a plan clicked, then the Stripe session expired, with no trial or purchase after. Draft only if:
  - an address is held;
  - not opted out;
  - not internal;
  - not a founder test;
  - `checkout-abandon` hasn't mailed them (it mails once ever).

Rules:
- **Dedupe:**
  - skip anyone in `~/.claude/sqlquest-cs-log.json`;
  - skip anyone the founder has written to: Gmail `to:<addr> OR from:<addr>` in:anywhere, and `list_drafts`;
  - skip any thread `payment-rescue-email-followup` covers.
- **Email voice:**
  - founder in the subject, phrasing varied;
  - say it's written by hand to a short list;
  - one specific fact about the person (solves, target company, plan), and one question;
  - no pitch, no sequence; never two identical bodies;
  - sign off `Göktuğ` / `Founder, SQL Quest`.
- Facts must be true. Read them; never infer a plan or date you didn't read.
- Log each draft (username, kind, draft id, date) in `~/.claude/sqlquest-cs-log.json`. Never put customer data in the repo.
- Weekly (Sunday): `docs/reads/customer-voice-<date>.md`. It holds only the reasons people gave (no names) and where each one points; add a BACKLOG line per actionable reason.

## Feedback triage (added 2026-11-23, founder: "olması gerektiği gibi yap")

E1 owns every message a person sends us. Plan: `docs/plans/feedback-system-2026-11-23.md`.

- **Daily, read:**
  - new `feedback` rows: the widget, plus the asked prompts `exit_reason`,
    `day2` and `purchase_reason`;
  - new Gmail replies to the founder's notes.
- **Within 24 hours:** a row with contact gets a Gmail draft reply in the
  email voice. Answer the question. If there is a promise, keep it in the log.
- **Security or abuse** (keywords: quota, unlimited, bypass, exploit,
  security, password, refund dispute) is the **first line of the founder
  report the same day**, with a BACKLOG line marked SECURITY.
- **Bugs and missing things** become a BACKLOG line `FB-<YYYY-MM-DD>-<n>`:
  the paraphrase, the screen, and the challenge id if present. Never the
  person's name or words.
- **Close the loop.** When an `FB-…` line ships (it shows up in the merged PRs),
  draft a one-line "you asked, it's live" note to that person, if there is
  contact.
- **Log** each read row and each reply draft (id, kind, `drafted_at`, and
  `sent_at` when seen in Gmail's sent folder) in `~/.claude/sqlquest-cs-log.json`.

## The personal prep plan (added 2026-11-22, founder)

Founder: "Hedefi olan kişiye kişiselleştirilmiş ve özenilmiş bir programla
ulaşıp soracağız … hiçbir uygulama founder'ı direkt müşteriye ulaşmıyor, biz
ulaşacağız."

It is step 2 of four:

| Step | What | Sent by |
|---|---|---|
| 1 | `goal-note mode=new` asks the goal | automated, with honest copy |
| 2 | **the personal plan** | **E1 drafts it, the founder sends it** |
| 3 | `prep-plan-note` daily items | automated, once deployed |
| 4 | `interview-outcome-note` after the date | automated |

**Trigger.** A registered person who gives the goal `interview` together with a company or a date. Any of these counts:
- the goal-note link and the date ask;
- a reply to the founder;
- the intake;
- `prepTarget` set in the app.

**The draft is a Gmail draft.** The founder reads it in about a minute and sends it himself. That is what makes "I wrote this for you" true, so the draft may say it. Contents:
- **Subject:** names the founder and the company, e.g. `From SQL Quest's founder — your Capital One plan`.
- **The two weakest canonical skills on their Skillmap,** by name and score. Read these; never infer them.
- **The company.** The tagged set and how many of it they have solved. For a sourced page, one sentence on the reported format, with the page link. Nothing beyond the dated source.
- **A schedule over the days left.** It comes from the same planner the app uses (`planToDate`, via prep-plan-note's `plan.ts`), never a second planner. It says what to do on which days, and when to sit the mock.
- **One question:** "What would make you feel ready by <date>?"
- **No price and no pitch.** If an item is Pro, it says "(Pro)" once, the way prep-plan-note does.
- **Sign-off:** `Göktuğ` / `Founder, SQL Quest`.

**Load.** About 15–30 people a week at current sign-ups. If drafts pile up beyond 10 a day, keep them waiting rather than sending a weaker template.

**Holdout.** The founder decides. The default is none until he answers. If one is set, the excluded share is chosen by a murmur-finalised hash of the username and logged. Excluded people still get steps 1, 3 and 4.

**Read.** Reply rate, then a trial or purchase within 14 days, compared with interview-goal people who were not drafted in the same weeks. This comparison is confounded unless a holdout exists, and the read must say so.
