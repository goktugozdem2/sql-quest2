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
