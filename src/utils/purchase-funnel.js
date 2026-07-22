// SQL Quest — purchase funnel, counted in people
//
// The monetization numbers in the metrics report count EVENTS, which
// flatters a broken checkout: one frustrated user cycling three plans in
// 37 seconds reads as three conversions off the modal. That actually
// happened (hrishi998, 2026-07-13; yisus, 2026-07-15) and it's why this
// exists — the question "who is close to buying" needs people, not clicks.
//
// Two rules the shape depends on:
//
//  1. Every rung is unioned with the rungs below it, so the funnel can only
//     narrow. A user who paid counts as having reached checkout even if the
//     earlier event failed to log.
//  2. Every rung is then intersected with the engaged population. Without
//     that, "shown the offer" counted 66 against an engaged base of 54,
//     because plenty of people meet the modal before their fifth solve. A
//     step that can exceed the one above it isn't measuring progression.
//
// Buyers below the engagement floor are real revenue but the wrong shape
// for this funnel, so they're reported beside it as purchasesOutsideEngaged.
//
// KNOWN HORIZON. Engagement is counted from `challenge_solved` events, and
// those only start 2026-06-30. Anyone whose activity predates that reads as
// unengaged here no matter how much they actually solved — elena has 134
// solves in the users table and scores 0 in this funnel. So treat the
// engaged base as "engaged since we started measuring", not "engaged", and
// don't use it to write anyone off. Fixing it properly means reading
// data->solvedChallenges off the users table; worth doing, not yet done.

export const DEFAULT_MIN_SOLVES = 5;

// pro_events.metadata is double-encoded — jsonb holding a JSON string — so a
// single parse still leaves a string. Unwrap until it's an object.
export function parseEventMetadata(row) {
  let v = row?.metadata;
  for (let i = 0; i < 3 && typeof v === 'string'; i += 1) {
    try { v = JSON.parse(v); } catch (_) { return {}; }
  }
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
}

const usersWhere = (rows, pred) =>
  new Set(rows.filter(pred).map(r => r.username).filter(Boolean));
const union = (...sets) => new Set(sets.flatMap(s => [...s]));
const pct = (num, den) => (den ? Math.round((num / den) * 1000) / 10 : 0);

export function computePurchaseFunnel(proEvents = [], options = {}) {
  const minSolves = options.minSolves ?? DEFAULT_MIN_SOLVES;
  const rows = Array.isArray(proEvents) ? proEvents : [];

  const solvesByUser = rows
    .filter(r => r && r.reason === 'activation_funnel' && r.event === 'challenge_solved' && r.username)
    .reduce((acc, r) => { acc[r.username] = (acc[r.username] || 0) + 1; return acc; }, {});
  const engagedUsers = new Set(
    Object.entries(solvesByUser).filter(([, n]) => n >= minSolves).map(([u]) => u),
  );

  const purchasedUsers = usersWhere(rows, r =>
    r.event === 'pro_purchase_completed' || r.event === 'pro_renewal_completed');
  const checkoutUsers = union(usersWhere(rows, r => r.event === 'pro_checkout_clicked'), purchasedUsers);
  const planClickUsers = union(usersWhere(rows, r => /^click_/.test(r.event || '')), checkoutUsers);
  const askedUsers = union(
    usersWhere(rows, r => r.event === 'pro_modal_shown' || r.event === 'modal_shown'),
    planClickUsers,
  );

  const inEngaged = set => [...set].filter(u => engagedUsers.has(u)).length;
  const steps = [
    ['engaged', engagedUsers.size],
    ['shown_the_offer', inEngaged(askedUsers)],
    ['clicked_a_plan', inEngaged(planClickUsers)],
    ['reached_checkout', inEngaged(checkoutUsers)],
    ['purchased', inEngaged(purchasedUsers)],
  ].map(([step, users], i, arr) => ({
    step,
    users,
    fromPrevPct: i === 0 ? null : pct(users, arr[i - 1][1]),
    fromEngagedPct: pct(users, arr[0][1]),
  }));

  // How often an asked user actually gets asked. The offer firing once
  // across weeks of daily use is a different problem from the offer being
  // rejected, and the two look identical if you only count distinct users.
  const askCounts = rows
    .filter(r => r.event === 'pro_modal_shown' && r.username)
    .reduce((acc, r) => { acc[r.username] = (acc[r.username] || 0) + 1; return acc; }, {});
  const askValues = Object.values(askCounts);
  const avgTimesAsked = askValues.length
    ? Math.round((askValues.reduce((a, b) => a + b, 0) / askValues.length) * 10) / 10
    : 0;

  const engagedNeverAsked = [...engagedUsers]
    .filter(u => !askedUsers.has(u) && !purchasedUsers.has(u));

  // Why checkout clicks died. never_navigated and instant_bounce are
  // defects; only left_checkout is a price signal. Before the
  // pro_checkout_returned event (2026-07-23) these were one
  // undifferentiated "clicked but didn't buy".
  const checkoutReturns = rows.filter(r => r.event === 'pro_checkout_returned');
  const checkoutOutcomes = checkoutReturns.reduce((acc, r) => {
    const k = parseEventMetadata(r).outcome || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const defects = (checkoutOutcomes.never_navigated || 0) + (checkoutOutcomes.instant_bounce || 0);

  const rungOf = u => (checkoutUsers.has(u) ? 1 : planClickUsers.has(u) ? 2 : askedUsers.has(u) ? 3 : 4);
  const hotLeads = [...union(engagedUsers, checkoutUsers, planClickUsers)]
    .filter(u => !purchasedUsers.has(u))
    .map(u => ({
      username: u,
      rung: rungOf(u),
      solves: solvesByUser[u] || 0,
      timesAsked: askCounts[u] || 0,
      isGuest: /^guest/i.test(u),
    }))
    .sort((a, b) => a.rung - b.rung || b.solves - a.solves);

  return {
    engagedMinSolves: minSolves,
    steps,
    purchasesOutsideEngaged: [...purchasedUsers].filter(u => !engagedUsers.has(u)).length,
    engagedNeverAsked,
    avgTimesAsked,
    checkoutOutcomes,
    checkoutReturnCount: checkoutReturns.length,
    checkoutDefectRatePct: pct(defects, checkoutReturns.length),
    hotLeads,
  };
}
