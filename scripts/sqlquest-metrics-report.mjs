#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { computePurchaseFunnel } from '../src/utils/purchase-funnel.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abmgtjafghpupaqsjnwe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SQ_SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outPath = outIndex >= 0 ? args[outIndex + 1] : (args.find(arg => arg.startsWith('--out=')) || '').slice('--out='.length);

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SQ_SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Usage: SQ_SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/sqlquest-metrics-report.mjs [--out public/kpis.json]');
  process.exit(1);
}

if (outIndex >= 0 && !outPath) {
  console.error('Missing value for --out.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
};

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const isoSince = days => new Date(now - days * dayMs).toISOString();
const pct = (num, den) => den ? Math.round((num / den) * 1000) / 10 : 0;
const eventTime = row => row.created_at || row.captured_at || row.date || row.updated_at;
const TARGETS = {
  min_lesson1_started_users: 30,
  lesson1_start_to_complete_pct: 35,
  first_challenge_start_to_solve_pct: 45,
  pro_modal_to_checkout_pct: 8,
  referral_click_to_signup_pct: 10,
  // Purchase-funnel gates, all counted in people.
  // An engaged user who has never been shown the offer is not a hard sell,
  // they're an unasked one — so this is a bug budget, not a conversion goal.
  max_engaged_never_asked: 5,
  // Asking once across weeks of daily use isn't an offer, it's a rumour.
  min_avg_times_asked: 2,
  // Any share of checkout clicks that died before reaching Stripe is a
  // defect. Not a conversion target — a ceiling that should be near zero.
  max_checkout_defect_pct: 10,
};

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${text.slice(0, 180)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function count(table, filter = '') {
  const query = filter ? `${filter}&select=*` : 'select=*';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    method: 'HEAD',
    headers: { ...headers, prefer: 'count=exact' },
  });
  const range = res.headers.get('content-range') || '';
  const value = range.includes('/') ? range.split('/').pop() : '0';
  return Number(value === '*' ? 0 : value) || 0;
}

async function getAll(table, query, pageSize = 1000) {
  const rows = [];
  for (let page = 0; page < 25; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { ...headers, range: `${from}-${to}` },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${res.status} ${table}: ${text.slice(0, 180)}`);
    const data = text ? JSON.parse(text) : [];
    rows.push(...data);
    if (data.length < pageSize) break;
  }
  return rows;
}

function countBy(rows, keyFn) {
  return rows.reduce((acc, row) => {
    const key = keyFn(row) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function uniqueUsers(rows) {
  return new Set(rows.map(row => row.username || row.user || 'unknown')).size;
}

function recent(rows, days) {
  const sinceMs = now - days * dayMs;
  return rows.filter(row => {
    const ts = Date.parse(eventTime(row) || '');
    return Number.isFinite(ts) && ts >= sinceMs;
  });
}

function dayKey(value) {
  const ts = Date.parse(value || '');
  return Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : '';
}

function makeDailyTrend(days, series) {
  const start = new Date(now - (days - 1) * dayMs);
  const dates = Array.from({ length: days }, (_, index) => {
    const d = new Date(start.getTime() + index * dayMs);
    return d.toISOString().slice(0, 10);
  });
  const counts = Object.fromEntries(series.map(item => [item.key, Object.create(null)]));
  for (const item of series) {
    for (const row of item.rows || []) {
      const key = dayKey(eventTime(row));
      if (key && dates.includes(key)) counts[item.key][key] = (counts[item.key][key] || 0) + 1;
    }
  }
  return dates.map(date => ({
    date,
    ...Object.fromEntries(series.map(item => [item.key, counts[item.key][date] || 0])),
  }));
}

const [
  usersTotal,
  users30,
  users7,
  usersPrev7,
  usersRecent,
  emailCapturesTotal,
  publicProfilesTotal,
  tutorEventsTotal,
  aiUsageTotal,
  referralsTotal,
  proEvents,
  referrals,
] = await Promise.all([
  count('users'),
  count('users', `created_at=gte.${encodeURIComponent(isoSince(30))}`),
  count('users', `created_at=gte.${encodeURIComponent(isoSince(7))}`),
  Promise.all([
    count('users', `created_at=gte.${encodeURIComponent(isoSince(14))}`),
    count('users', `created_at=gte.${encodeURIComponent(isoSince(7))}`),
  ]).then(([last14, last7]) => Math.max(0, last14 - last7)),
  getAll('users', `select=created_at&created_at=gte.${encodeURIComponent(isoSince(30))}&order=created_at.asc`),
  count('email_captures'),
  count('public_profiles'),
  count('tutor_events'),
  count('ai_usage'),
  count('referrals'),
  getAll('pro_events', 'select=event,reason,metadata,username,created_at&order=created_at.desc'),
  getAll('referrals', 'select=event_type,ref_code,created_at,amount_cents&order=created_at.desc'),
]);

const funnelEvents = proEvents.filter(row => row.reason === 'activation_funnel');
const funnel30 = recent(funnelEvents, 30);
const lesson1Events = funnelEvents.filter(row => /^lesson1_/.test(row.event || ''));
const lesson1EventRows = event => lesson1Events.filter(row => row.event === event);
const lesson1Started = lesson1EventRows('lesson1_started');
const lesson1Completed = lesson1EventRows('lesson1_completed');
const lesson1ReviewsScheduled = lesson1EventRows('lesson1_review_scheduled');
const lesson1ReviewsCompleted = lesson1EventRows('lesson1_review_completed');
const lesson1StartedUsers = uniqueUsers(lesson1Started);
const lesson1CompletedUsers = uniqueUsers(lesson1Completed);
const lesson1StartToCompletePct = pct(lesson1CompletedUsers, lesson1StartedUsers);
const lesson1ReviewScheduledUsers = uniqueUsers(lesson1ReviewsScheduled);
const lesson1ReviewCompletedUsers = uniqueUsers(lesson1ReviewsCompleted);
const firstChallengeStarted = funnelEvents.filter(row => row.event === 'first_challenge_started').length;
const firstChallengeSolved = funnelEvents.filter(row => row.event === 'first_challenge_solved').length;
const firstChallengeStartToSolvePct = pct(firstChallengeSolved, firstChallengeStarted);
const proCheckoutClicks = proEvents.filter(row => /^click_/.test(row.event || '')).length;
const proModalShown = proEvents.filter(row => row.event === 'modal_shown').length;
const proModalToCheckoutPct = pct(proCheckoutClicks, proModalShown);
const referralByType = countBy(referrals, row => row.event_type);
const referralClickToSignupPct = pct(referralByType.signup || 0, referralByType.click || 0);
const referralBySource = Object.entries(
  referrals.reduce((acc, row) => {
    const key = row.ref_code || 'unknown';
    acc[key] ||= { clicks: 0, signups: 0, pro: 0 };
    if (row.event_type === 'click') acc[key].clicks += 1;
    if (row.event_type === 'signup') acc[key].signups += 1;
    if (row.event_type === 'pro_conversion') acc[key].pro += 1;
    return acc;
  }, {})
).sort((a, b) => ((b[1].clicks || 0) + (b[1].signups || 0) * 10 + (b[1].pro || 0) * 100)
  - ((a[1].clicks || 0) + (a[1].signups || 0) * 10 + (a[1].pro || 0) * 100));

// ── Purchase funnel, counted in PEOPLE ──────────────────────────────
// Pure logic lives in src/utils/purchase-funnel.js with tests; keeping it
// inline here meant a metric nobody could assert on.
// Engagement truth comes from the users table, not events — challenge_solved
// events only start 2026-06-30, and event counts scored elena (134 lifetime
// solves) as 0. `order=username` gives keyset-stable pagination for getAll's
// range windows; `data->solvedChallenges` returns the jsonb array itself,
// so length is computed here.
const userSolveRows = await getAll('users', 'select=username,solves:data->solvedChallenges&order=username.asc');
const solvesByUser = Object.fromEntries(
  userSolveRows
    .filter(r => r.username)
    .map(r => [r.username, Array.isArray(r.solves) ? r.solves.length : 0]),
);
const funnel = computePurchaseFunnel(proEvents, { minSolves: 5, solvesByUser });
const engagedNeverAsked = funnel.engagedNeverAsked;
const avgTimesAsked = funnel.avgTimesAsked;
const checkoutOutcomes = funnel.checkoutOutcomes;

const lesson1GateStatus = lesson1StartedUsers < TARGETS.min_lesson1_started_users
  ? 'collecting'
  : lesson1StartToCompletePct >= TARGETS.lesson1_start_to_complete_pct
  ? 'ready'
  : 'blocked';
const daily30 = makeDailyTrend(30, [
  { key: 'signups', rows: usersRecent },
  { key: 'lesson1_started', rows: lesson1Started },
  { key: 'lesson1_completed', rows: lesson1Completed },
  { key: 'pro_modal_shown', rows: proEvents.filter(row => row.event === 'modal_shown') },
  { key: 'pro_checkout_clicked', rows: proEvents.filter(row => /^click_/.test(row.event || '') || row.event === 'pro_checkout_clicked') },
]);

const nextActions = [
  lesson1GateStatus === 'collecting'
    ? `Collect at least ${TARGETS.min_lesson1_started_users} Lesson 1 starts before judging expansion.`
    : null,
  lesson1GateStatus === 'blocked'
    ? 'Do not add more lessons yet; improve Lesson 1 completion before expanding the curriculum.'
    : null,
  lesson1StartedUsers >= TARGETS.min_lesson1_started_users && lesson1StartToCompletePct < TARGETS.lesson1_start_to_complete_pct
    ? 'Inspect Lesson 1 drop-off by exercise_completed, wrong_attempt, hint_used, and answer_shown events.'
    : null,
  firstChallengeStarted > 0 && firstChallengeStartToSolvePct < TARGETS.first_challenge_start_to_solve_pct
    ? 'Keep the first challenge path secondary until Lesson 1 graduates more users into challenge solves.'
    : null,
  proModalShown > 20 && proModalToCheckoutPct < TARGETS.pro_modal_to_checkout_pct
    ? 'Keep Pro prompts later in the journey; modal-to-checkout is below target.'
    : null,
  (referralByType.click || 0) > 20 && referralClickToSignupPct < TARGETS.referral_click_to_signup_pct
    ? 'Tighten referral landing/onboarding; clicks are not becoming signups at the target rate.'
    : null,
  engagedNeverAsked.length > TARGETS.max_engaged_never_asked
    ? `${engagedNeverAsked.length} engaged users have never seen the offer (${engagedNeverAsked.slice(0, 6).join(', ')}). Widen the trigger before touching price or copy.`
    : null,
  Object.keys(funnel.checkoutOutcomes).length >= 0 && avgTimesAsked > 0 && avgTimesAsked < TARGETS.min_avg_times_asked
    ? `The offer fires ${avgTimesAsked}x per user on average. Asking once is not a rejection — re-fire before reading modal conversion as a price signal.`
    : null,
  funnel.checkoutReturnCount >= 3 && funnel.checkoutDefectRatePct > TARGETS.max_checkout_defect_pct
    ? 'Checkout clicks are dying before Stripe loads. This is a bug, not a pricing result — fix it before reading any conversion number.'
    : null,
  funnel.checkoutReturnCount === 0 && funnel.steps[3].users > 0
    ? 'No pro_checkout_returned rows yet — checkout outcome telemetry shipped 2026-07-23, so this stays blank until the next checkout click.'
    : null,
].filter(Boolean);

const report = {
  generated_at: new Date().toISOString(),
  acquisition: {
    users_total: usersTotal,
    users_30d: users30,
    users_7d: users7,
    users_prev_7d: usersPrev7,
    signup_wow_pct: pct(users7 - usersPrev7, usersPrev7),
  },
  activation_funnel: {
    total: countBy(funnelEvents, row => row.event),
    last_30d: countBy(funnel30, row => row.event),
    first_challenge_start_to_solve_pct: firstChallengeStartToSolvePct,
    lesson1: {
      started_users: lesson1StartedUsers,
      completed_users: lesson1CompletedUsers,
      start_to_complete_pct: lesson1StartToCompletePct,
      exercise_completed_events: lesson1EventRows('lesson1_exercise_completed').length,
      wrong_attempt_events: lesson1EventRows('lesson1_wrong_attempt').length,
      hint_used_events: lesson1EventRows('lesson1_hint_used').length,
      answer_shown_events: lesson1EventRows('lesson1_answer_shown').length,
      review_scheduled_users: lesson1ReviewScheduledUsers,
      review_completed_users: lesson1ReviewCompletedUsers,
      review_completion_pct: pct(lesson1ReviewCompletedUsers, lesson1ReviewScheduledUsers),
    },
  },
  engagement: {
    tutor_events_total: tutorEventsTotal,
    ai_usage_total: aiUsageTotal,
    public_profiles_total: publicProfilesTotal,
    email_captures_total: emailCapturesTotal,
    profile_publish_rate_pct: pct(publicProfilesTotal, usersTotal),
    email_capture_rate_pct: pct(emailCapturesTotal, usersTotal),
  },
  monetization: {
    pro_modal_shown: proModalShown,
    pro_checkout_clicks: proCheckoutClicks,
    pro_modal_to_checkout_pct: proModalToCheckoutPct,
    pro_purchase_completed_events: proEvents.filter(row => row.event === 'pro_purchase_completed').length,
    pro_purchase_pending_events: proEvents.filter(row => row.event === 'pro_purchase_pending').length,
    pro_renewal_completed_events: proEvents.filter(row => row.event === 'pro_renewal_completed').length,
  },
  // Same journey as `monetization`, counted in people instead of clicks.
  // Read this one when asking "who is close to buying" — the event-based
  // rates above can't tell repeat clicking from repeat interest.
  purchase_funnel: {
    engaged_min_solves: funnel.engagedMinSolves,
    solves_source: funnel.solvesSource,
    steps: funnel.steps,
    purchases_outside_engaged: funnel.purchasesOutsideEngaged,
    engaged_never_asked: funnel.engagedNeverAsked.length,
    engaged_never_asked_users: funnel.engagedNeverAsked.slice(0, 20),
    avg_times_asked: funnel.avgTimesAsked,
    checkout_outcomes: funnel.checkoutOutcomes,
    checkout_defect_rate_pct: funnel.checkoutDefectRatePct,
    hot_leads: funnel.hotLeads.slice(0, 20),
  },
  referrals: {
    referrals_total: referralsTotal,
    by_type: referralByType,
    click_to_signup_pct: referralClickToSignupPct,
    click_to_pro_pct: pct(referralByType.pro_conversion || 0, referralByType.click || 0),
    top_sources: referralBySource.slice(0, 12),
  },
  trends: {
    daily_30d: daily30,
  },
  targets: TARGETS,
  decision_gates: {
    lesson1_before_more_lessons: {
      status: lesson1GateStatus,
      started_users: lesson1StartedUsers,
      target_started_users: TARGETS.min_lesson1_started_users,
      start_to_complete_pct: lesson1StartToCompletePct,
      target_start_to_complete_pct: TARGETS.lesson1_start_to_complete_pct,
    },
  },
  next_actions: nextActions.length ? nextActions : ['Targets are currently met; continue weekly monitoring before widening scope.'],
};

const output = JSON.stringify(report, null, 2);
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${output}\n`);
  console.error(`[metrics] wrote ${outPath}`);
} else {
  console.log(output);
}
