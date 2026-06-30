#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abmgtjafghpupaqsjnwe.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SQ_SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SQ_SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Usage: SQ_SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/sqlquest-metrics-report.mjs');
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

const [
  usersTotal,
  users30,
  users7,
  usersPrev7,
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
const proCheckoutClicks = proEvents.filter(row => /^click_/.test(row.event || '')).length;
const proModalShown = proEvents.filter(row => row.event === 'modal_shown').length;
const referralByType = countBy(referrals, row => row.event_type);
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
    first_challenge_start_to_solve_pct: pct(
      funnelEvents.filter(row => row.event === 'first_challenge_solved').length,
      funnelEvents.filter(row => row.event === 'first_challenge_started').length,
    ),
    lesson1: {
      started_users: uniqueUsers(lesson1Started),
      completed_users: uniqueUsers(lesson1Completed),
      start_to_complete_pct: pct(uniqueUsers(lesson1Completed), uniqueUsers(lesson1Started)),
      exercise_completed_events: lesson1EventRows('lesson1_exercise_completed').length,
      wrong_attempt_events: lesson1EventRows('lesson1_wrong_attempt').length,
      hint_used_events: lesson1EventRows('lesson1_hint_used').length,
      answer_shown_events: lesson1EventRows('lesson1_answer_shown').length,
      review_scheduled_users: uniqueUsers(lesson1ReviewsScheduled),
      review_completed_users: uniqueUsers(lesson1ReviewsCompleted),
      review_completion_pct: pct(uniqueUsers(lesson1ReviewsCompleted), uniqueUsers(lesson1ReviewsScheduled)),
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
    pro_modal_to_checkout_pct: pct(proCheckoutClicks, proModalShown),
    pro_purchase_completed_events: proEvents.filter(row => row.event === 'pro_purchase_completed').length,
    pro_purchase_pending_events: proEvents.filter(row => row.event === 'pro_purchase_pending').length,
    pro_renewal_completed_events: proEvents.filter(row => row.event === 'pro_renewal_completed').length,
  },
  referrals: {
    referrals_total: referralsTotal,
    by_type: referralByType,
    click_to_signup_pct: pct(referralByType.signup || 0, referralByType.click || 0),
    click_to_pro_pct: pct(referralByType.pro_conversion || 0, referralByType.click || 0),
    top_sources: referralBySource.slice(0, 12),
  },
};

console.log(JSON.stringify(report, null, 2));
