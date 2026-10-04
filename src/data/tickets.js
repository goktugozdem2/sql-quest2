// First 90 Days — ticket exercises (2026-10-04, docs/plans/ticket-exercises-2026-09-21.md).
//
// A challenge says what to return. A ticket says what a PM wants to know, and
// the analyst decides the columns, the grain and the filters. Graded on the
// FIGURES in the answer (src/utils/ticket-grade.js), never on its shape.
//
// Rules:
//   - `reference` is never shown anywhere (the question-pages rule). It exists
//     so tests/tickets.test.js can recompute every expected figure from the
//     dataset; a figure that stops matching the data fails CI.
//   - `expect.numbers[].tol` is the rounding a reasonable answer may carry
//     (2.46 vs 2.5); a `percent` figure also matches its fraction (0.0246).
//   - `expect.text` are values that must appear as a cell (a category, a
//     reason), compared case-insensitively.
//   - `label` names a figure WITHOUT giving it; the grader shows labels of what
//     is missing, never values.
//   - The people are invented and named by role; no company is named.

export const TICKET_MAX_ROWS = 25;

export const TICKETS = [
  {
    id: 't-card-declines',
    dataset: 'finans_neobank',
    title: 'Are card payments failing?',
    from: 'Priya, Product Manager (Cards)',
    due: 'for Thursday’s support sync',
    request: 'Support says customers keep complaining that their card gets declined. Before we escalate: across everything we have, what share of card payments were declined, and what is the most common reason? One number and one reason is enough.',
    reference: "SELECT ROUND(100.0 * SUM(status = 'declined') / COUNT(*), 2) AS decline_rate_pct, (SELECT decline_reason FROM transactions WHERE type = 'card_payment' AND status = 'declined' GROUP BY decline_reason ORDER BY COUNT(*) DESC LIMIT 1) AS top_reason FROM transactions WHERE type = 'card_payment';",
    expect: {
      numbers: [{ label: 'the decline rate of card payments', value: 2.46, tol: 0.05, percent: true }],
      text: [{ label: 'the most common decline reason', value: 'insufficient_funds' }],
    },
    reply: 'One line back to Priya: is this a problem worth escalating?',
    skills: ['Conditional Logic', 'Aggregation & Grouping'],
  },
  {
    id: 't-uk-card-spend',
    dataset: 'finans_neobank',
    title: 'Where do UK customers spend?',
    from: 'Tom, Partnerships',
    due: 'before the merchant call on Friday',
    request: 'We are pitching a cashback partner. For customers based in the UK, which merchant category takes the most card spend in pounds, and how much is it? Only payments that actually went through.',
    reference: "SELECT t.merchant_category, ROUND(SUM(t.amount_gbp), 2) AS spend_gbp FROM transactions t JOIN users u ON u.user_id = t.user_id WHERE u.country = 'GB' AND t.type = 'card_payment' AND t.status = 'completed' GROUP BY t.merchant_category ORDER BY spend_gbp DESC LIMIT 1;",
    expect: {
      numbers: [{ label: 'the spend in that category (GBP)', value: 7626.42, tol: 1 }],
      text: [{ label: 'the top merchant category', value: 'shopping' }],
    },
    reply: 'One line back to Tom: which category should the pitch lead with, and why?',
    skills: ['Joins', 'Aggregation & Grouping'],
  },
  {
    id: 't-referral-kyc',
    dataset: 'finans_neobank',
    title: 'Do referred users verify faster?',
    from: 'Ana, Growth',
    due: 'for the referral programme review',
    request: 'The referral team claims referred users get through identity checks (KYC) faster. Can you check? Average days from sign-up to KYC, referred users against everyone else. Leave out people who never verified.',
    reference: "SELECT CASE WHEN referred_by IS NULL THEN 'organic' ELSE 'referred' END AS grp, ROUND(AVG(julianday(kyc_verified_at) - julianday(signup_date)), 2) AS avg_days FROM users WHERE kyc_verified_at IS NOT NULL GROUP BY grp;",
    expect: {
      numbers: [
        { label: 'the average days for referred users', value: 2.96, tol: 0.05 },
        { label: 'the average days for everyone else', value: 2.88, tol: 0.05 },
      ],
      text: [],
    },
    reply: 'One line back to Ana: is the claim true?',
    skills: ['Date Functions', 'NULL Handling', 'Conditional Logic'],
  },
  {
    id: 't-chargeback-tier',
    dataset: 'finans_fraud',
    title: 'Is the high-risk tier riskier?',
    from: 'Sam, Risk Operations',
    due: 'for the monthly risk review',
    request: 'We label merchants low, medium or high risk. Does the label mean anything? For each risk tier, what share of transactions ended up as a chargeback?',
    reference: "WITH tx AS (SELECT m.risk_tier, COUNT(*) AS n FROM transactions t JOIN merchants m ON m.merchant_id = t.merchant_id GROUP BY m.risk_tier), cb AS (SELECT m.risk_tier, COUNT(*) AS c FROM chargebacks c JOIN merchants m ON m.merchant_id = c.merchant_id GROUP BY m.risk_tier) SELECT tx.risk_tier, ROUND(100.0 * cb.c / tx.n, 2) AS chargeback_rate_pct FROM tx JOIN cb ON cb.risk_tier = tx.risk_tier ORDER BY chargeback_rate_pct DESC;",
    expect: {
      numbers: [
        { label: 'the chargeback rate for the high tier', value: 3.82, tol: 0.01, percent: true },
        { label: 'the chargeback rate for the medium tier', value: 3.54, tol: 0.01, percent: true },
        { label: 'the chargeback rate for the low tier', value: 3.43, tol: 0.01, percent: true },
      ],
      text: [],
    },
    reply: 'One line back to Sam: does the risk label predict chargebacks?',
    skills: ['Joins', 'Subqueries & CTEs', 'Aggregation & Grouping'],
    trap: 'sql-join-fan-out',
  },
  {
    id: 't-open-chargebacks',
    dataset: 'finans_fraud',
    title: 'How much is still in dispute?',
    from: 'Lena, Finance',
    due: 'for the quarter-end accrual',
    request: 'Finance needs to know what is still hanging: how many chargebacks are still open, and what is the total amount of the transactions behind them?',
    reference: "SELECT COUNT(*) AS open_chargebacks, ROUND(SUM(t.amount), 2) AS amount_in_dispute FROM chargebacks c JOIN transactions t ON t.txn_id = c.txn_id WHERE c.status = 'open';",
    expect: {
      numbers: [
        { label: 'the number of open chargebacks', value: 19, tol: 0 },
        { label: 'the amount in dispute', value: 2078.08, tol: 1 },
      ],
      text: [],
    },
    reply: 'One line back to Lena: the figure she can book, in a sentence.',
    skills: ['Joins', 'Aggregation & Grouping'],
  },
];

export const TICKET_DATASETS = [...new Set(TICKETS.map(t => t.dataset))];
