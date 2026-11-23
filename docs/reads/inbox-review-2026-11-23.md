# Inbox review: every user message to the founder, through 2026-11-23

Founder's ask (11-23): "kullanıcılardan şu ana kadar gelen mailleri tekrar
değerlendir, kaçırdığımız feedbackler var mı". This is the repo-safe
aggregate. There are no names, emails or quotes; the per-thread table stays
on the laptop because it holds customer data.

**Sources:**
- 7 Gmail threads in which a user wrote to the founder (6 people);
- 7 real rows in the `feedback` table (6 people).

support@sqlquest.app has never received mail from a user. There are 0
`interview_outcome` events.

## Themes

| Theme | n | State |
|---|---|---|
| Grader fairness: row order (2), SQL dialect (1) | 3 | Fixed and closed with the person |
| Billing and cancellation friction: no cancel button; the in-app auto-renew switch never reached Stripe | 2 | Fixed (Stripe portal). One wrongful charge was refunded the next day. |
| Price sensitivity, both from payers | 2 | Answered |
| Interview reports from paying users: Amazon BIE ×2, Capital One, Stripe | 3 people | The Amazon report became 3 challenges and a dossier row. **The Stripe report (a reconciliation round) was never used.** |
| Discoverability and screen load: layout overload, hidden table columns, search by number, a path filter that hid the bank | 4 | Mostly fixed; the layout only partly (the reporter was never told; a reply is drafted) |
| Arrived because an AI assistant recommended us | 1 | — |
| "What's my mistake?" sent through the feedback widget, with no contact left | 2 | Cannot be answered: the widget records no query, no challenge and no contact |
| Security / abuse report | 1 | **Unacknowledged for 69 days, still live.** Fix: #223 (held, 6d) |
| A job question from a payer | 1 | Unanswered. The founder's call. |

**Missed counts:**
- 3 unanswered messages that can still be answered;
- 2 with no contact left;
- 1 soft promise owed (now drafted);
- 1 broken promise, already remedied;
- 3 pieces of feedback never acted on, plus 1 partly.
