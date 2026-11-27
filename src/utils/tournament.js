// The first-session tournament — who enters, which arm, and what is stamped
// (plan: docs/plans/first-session-tournament-2026-11-26.md §2; metric
// `first_session_tournament`; registry src/data/tournament-arms.js).
//
// ── Who is "new" (exactly) ─────────────────────────────────────────────────
// A browser enters at its FIRST app open, decided once at module load in
// app.jsx before the app writes any key of its own:
//   - "first app open" = the browser holds no app key: hasPriorAppUse() from
//     the freeQuota holdout (#384, src/utils/free-quota-holdout.js) — reused,
//     not copied — over every localStorage key, with this test's own key
//     taken out. The landing tracker's and static pages' keys
//     (PRE_APP_KEYS) do not count, so a landing visit before /app/ is still
//     new; any other `sqlquest_` key means the app has run here before.
//   - a browser with app state is recorded `returning` (no arm, no event).
//   - a first open on a mock link (`?interview=`) is `excluded_interview_link`
//     and one on a profile (`?profile=` or `/u/<handle>`) is
//     `excluded_profile` (plan §2.1): no arm, no event.
// The record is written ONCE and a stored record always wins — nobody is
// re-armed, whatever the flag or the registry later says. The record also
// rides the account (`userData.tournament`); an account's own record wins
// over a browser's on sign-in (adoptAccountRecord), so a person keeps one
// arm across devices.
//
// After assignment two more people are taken out of the arm's BEHAVIOUR
// (tournamentEffectiveArm), never out of the read (intent to treat):
//   - a signed-in account created before this browser's assignment (an old
//     account on a new browser: a returning person);
//   - `hired` intent (they are past the interview; the Coach opens on First
//     90 Days).
//
// ── The profile, then the stratum, then the arm (founder, 2026-11-26) ──────
// "kişinin profilini anlamadan onu bir gruba alamayız. profile göre gruba
// almalıyız." So the first open builds a PROFILE (buildVisitorProfile: only
// what is known before the person does anything, no PII — the door, the
// company, interview-target, device, country if cached, price region,
// language, a timezone bucket, whether a landing page came first, the
// readiness band), the profile names one of four STRATA (interview-target ×
// desktop / phone+tablet, TOURNAMENT_STRATA), and the arm is drawn at random
// INSIDE the stratum. The arm is never picked from the profile: that would
// make arm and profile one variable, and no read could say which of the two
// moved the number. A random draw inside each stratum keeps every arm
// comparable within every profile; routing a stratum to its proven winner
// is a WEIGHT change (TOURNAMENT_STRATUM_WEIGHTS), never a rule on the
// profile, and keeps ≥ 20% exploring.
//
// ── Which arm ──────────────────────────────────────────────────────────────
// FNV over `${aid}:first_session_tournament_v1:${stratum}` (each stratum its
// own salt), then the murmur3 finalizer (CLAUDE.md, "A/B hash trap"; the
// companyDirectArm pattern). The draw u = h / 2^32 falls into the stratum's
// cumulative weights over the ACTIVE arms in slot order — equal unless the
// stratum is routed. Queued, eliminated and promoted arms are never
// assigned. Every assignment stores and logs the profile, the stratum, the
// weights, the draw and a human sentence saying why (`reason`).
//
// ── What an arm does in PR 1 ───────────────────────────────────────────────
// Nothing different: B and D are `built: false` in the registry, so
// tournamentBehaviour() resolves them to A_control. The assignment, the
// record, the event and the stamps all work, so the plumbing can be walked
// with the flag on in a preview (an A/A of the whole pipeline).
//
// Pure: storage, clock, aid, URL and flag are passed in.

import {
  TOURNAMENT_TEST_ID, TOURNAMENT_ARMS, TOURNAMENT_CONTROL_ID,
  TOURNAMENT_STRATA, TOURNAMENT_STRATUM_WEIGHTS, TOURNAMENT_MIN_EXPLORE,
  activeTournamentArms, tournamentArmById,
} from '../data/tournament-arms.js';
import { hasPriorAppUse } from './free-quota-holdout.js';
import { classifyLandingSrc } from './landing-src.js';

export const TOURNAMENT_KEY = 'sqlquest_tournament_v1';
export const TOURNAMENT_RECORD_STATUSES = Object.freeze([
  'enrolled', 'returning', 'excluded_interview_link', 'excluded_profile',
]);

/**
 * The 32-bit hash: FNV-1a-style over `${aid}:${testId}` (plus `:${salt}`
 * when a stratum salts it), murmur3-finalised.
 */
export function tournamentHash(aid, salt = '') {
  let h = 2166136261;
  const s = `${String(aid)}:${TOURNAMENT_TEST_ID}${salt ? `:${salt}` : ''}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// ── The visitor profile (built at the first app open) ──────────────────────

/** Every value `profile.door` can take. */
export const PROFILE_DOORS = Object.freeze([
  'company_page', 'company_link', 'readiness', 'sql_exercises', 'topic', 'question',
  'blog', 'homepage', 'ai', 'other_page', 'referrer', 'direct_unknown',
]);
/** Why a profile is interview-target (#409's entry signals), or null. */
export const PROFILE_IT_SIGNALS = Object.freeze([
  'company_page', 'company_link', 'readiness_door', 'readiness_result', 'capital_one_blog',
]);
export const PROFILE_DEVICES = Object.freeze(['desktop', 'tablet', 'phone']);
export const PROFILE_TZ_BUCKETS = Object.freeze(['americas', 'europe_africa', 'gulf_south_asia', 'east_asia_oceania']);
export const PROFILE_READINESS_BANDS = Object.freeze(['low', 'mid', 'high']);
export const PROFILE_VERSION = 1;

// The five SQL-trap pages (src/data/sql-patterns.js) are topic doors in
// #409's door table; their /app/ links carry the page slug as `src`.
const TRAP_SLUGS = new Set([
  'sql-not-in-null', 'sql-join-fan-out', 'sql-between-timestamp',
  'sql-average-of-averages', 'sql-left-join-where-filter',
]);
// Display names where title case is wrong ('capital-one' → 'Capital One').
const COMPANY_NAMES = Object.freeze({
  jpmorgan: 'JPMorgan', tiktok: 'TikTok', linkedin: 'LinkedIn', doordash: 'DoorDash',
  openai: 'OpenAI', paypal: 'PayPal', 'goldman-sachs': 'Goldman Sachs',
  'morgan-stanley': 'Morgan Stanley', nvidia: 'NVIDIA',
});

const slugify = (v) => {
  const s = String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || null;
};
// A door token as it rides the URL (`src`, `utm_source`): a slug, never a
// path or free text. Anything else reads as "an unrecognised page".
const doorToken = (v) => {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  return /^[a-z0-9:._-]{1,64}$/i.test(s) ? s.toLowerCase() : 'unrecognised';
};

/** 'capital-one' → 'Capital One'. */
export function companyDisplayName(slug) {
  if (!slug) return null;
  if (COMPANY_NAMES[slug]) return COMPANY_NAMES[slug];
  return String(slug).split('-').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

/** The device band, the landing tracker's bands (< 768 phone, < 1024 tablet). */
export function profileDevice(width) {
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w < 768 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
}

/**
 * A coarse timezone bucket from the offset EAST of UTC in minutes
 * (−new Date().getTimezoneOffset()). Never the zone name: four buckets say
 * enough for a read and nothing about a city.
 */
export function profileTzBucket(offsetEastMin) {
  if (offsetEastMin == null || offsetEastMin === '') return null;
  const m = Number(offsetEastMin);
  if (!Number.isFinite(m)) return null;
  if (m <= -180) return 'americas';          // UTC−3 and west
  if (m <= 180) return 'europe_africa';      // UTC−2 … UTC+3
  if (m <= 360) return 'gulf_south_asia';    // UTC+3:30 … UTC+6 (India)
  return 'east_asia_oceania';                // east of UTC+6
}

/** The browser's language: `?lang=` first, else navigator.language's primary tag. */
export function profileLanguage(langParam, navigatorLanguage) {
  const pick = (v) => {
    const m = String(v == null ? '' : v).trim().toLowerCase().match(/^([a-z]{2,3})(?:[-_]|$)/);
    return m ? m[1] : null;
  };
  return pick(langParam) || pick(navigatorLanguage);
}

/** The public readiness test's stored result → low / mid / high, or null. */
export function profileReadinessBand(record) {
  if (!record || typeof record !== 'object') return null;
  const o = Number(record.overall);
  if (!Number.isFinite(o)) return null;
  return o < 40 ? 'low' : o < 70 ? 'mid' : 'high';
}

/** India's price or the default one, from the ISO country; null when unknown. */
export function profilePriceRegion(country) {
  const c = typeof country === 'string' ? country.trim().toUpperCase() : '';
  if (!/^[A-Z]{2}$/.test(c)) return null;
  return c === 'IN' ? 'india' : 'default';
}

const isoCountry = (v) => {
  const c = typeof v === 'string' ? v.trim().toUpperCase() : '';
  return /^[A-Z]{2}$/.test(c) ? c : null;
};

/** One query-string value (first occurrence, decoded), or null. */
export function queryParam(search, name) {
  const q = String(search || '').replace(/^\?/, '');
  for (const part of q.split('&')) {
    const eq = part.indexOf('=');
    const k = eq < 0 ? part : part.slice(0, eq);
    if (k !== name) continue;
    const raw = (eq < 0 ? '' : part.slice(eq + 1)).replace(/\+/g, ' ');
    try { return decodeURIComponent(raw); } catch { return raw; }
  }
  return null;
}

const externalReferrerHost = (referrer, siteHost) => {
  try {
    if (!referrer) return null;
    const host = new URL(String(referrer)).hostname.toLowerCase();
    if (!host || host.endsWith('sqlquest.app') || (siteHost && host === String(siteHost).toLowerCase())) return null;
    return host.slice(0, 60);
  } catch { return null; }
};

/**
 * The door a first open came through, the company it names, and whether it
 * makes the person interview-target (#409's entry definition: a company
 * page, a `?company=` link, the readiness test or its stored result, the
 * Capital One blog). An AI-assistant landing source outranks the page for
 * the DOOR (#409's door table); it never removes interview-target.
 */
export function profileDoor({ src = null, company = null, sector = null, landingSrc = null, referrerHost = null, readinessRecord = null } = {}) {
  const s = doorToken(src);
  const companySlug = slugify(company);
  const pageCompany = s && /-sql-interview$/.test(s) ? s.replace(/-sql-interview$/, '') || null
    : s && /^blog-capital-one/.test(s) ? 'capital-one'
      : null;
  const ai = typeof landingSrc === 'string' && (/^ai:/.test(landingSrc) || landingSrc === 'utm:copilot.com');
  let door;
  if (ai) door = 'ai';
  else if (s && /-sql-interview$/.test(s)) door = 'company_page';
  else if (!s && companySlug) door = 'company_link';
  else if (s === 'readiness') door = 'readiness';
  else if (s && /^sql-exercises/.test(s)) door = 'sql_exercises';
  else if (s && (/^challenges(-|$)/.test(s) || /^pattern-/.test(s) || TRAP_SLUGS.has(s))) door = 'topic';
  else if (s && /^questions?(-|$)/.test(s)) door = 'question';
  else if (s && /^blog(-|$)/.test(s)) door = 'blog';
  else if (s === 'home') door = 'homepage';
  else if (s || slugify(sector)) door = 'other_page';
  else if (referrerHost) door = 'referrer';
  else door = 'direct_unknown';

  const doorSrc = s
    || (companySlug ? `company:${companySlug}` : null)
    || (slugify(sector) ? `sector:${slugify(sector)}` : null)
    || (referrerHost ? `ref:${referrerHost}` : null);

  let itSignal = null;
  if (s && /-sql-interview$/.test(s)) itSignal = 'company_page';
  else if (s === 'readiness') itSignal = 'readiness_door';
  else if (companySlug) itSignal = 'company_link';
  else if (s && /^blog-capital-one/.test(s)) itSignal = 'capital_one_blog';
  else if (profileReadinessBand(readinessRecord)) itSignal = 'readiness_result';

  return { door, doorSrc, company: companySlug || pageCompany, interviewTarget: itSignal != null, itSignal };
}

/**
 * The visitor's profile at the first app open — only signals known before
 * the person does anything, no PII (no aid, username, email, IP, city or
 * zone name). Inputs are passed in; app.jsx reads them at module load.
 *
 *   search, referrer, siteHost — window.location.search, document.referrer, location.hostname
 *   landingSrc       — the stored first-touch source (a landing page wrote it);
 *                      when absent, the app's own utm/referrer classification
 *   viewportWidth    — window.innerWidth
 *   country          — sessionStorage 'sqlquest_geo_country' if cached, else null
 *   navigatorLanguage, tzOffsetEastMin
 *   bootKeys         — the localStorage keys as the browser brought them
 *                      (a landing page's `sqlquest_aid` = it came first)
 *   readinessRecord  — localStorage `sqlquest_readiness_v1`, parsed
 */
export function buildVisitorProfile({
  search = '', referrer = '', siteHost = '', landingSrc = null, viewportWidth = null, country = null,
  navigatorLanguage = null, tzOffsetEastMin = null, bootKeys = [], readinessRecord = null,
} = {}) {
  const params = { get: (name) => queryParam(search, name) };
  const refHost = externalReferrerHost(referrer, siteHost);
  let lsrc = typeof landingSrc === 'string' && landingSrc ? landingSrc.slice(0, 64) : null;
  if (!lsrc) {
    try { lsrc = classifyLandingSrc({ source: params.get('utm_source'), referrer, siteHost }) || null; } catch { lsrc = null; }
  }
  const d = profileDoor({
    src: params.get('src') || params.get('utm_source'),
    company: params.get('company'),
    sector: params.get('sector'),
    landingSrc: lsrc,
    referrerHost: refHost,
    readinessRecord,
  });
  const c = isoCountry(country);
  const keys = Array.isArray(bootKeys) ? bootKeys : [];
  return {
    v: PROFILE_VERSION,
    door: d.door,
    doorSrc: d.doorSrc,
    company: d.company,
    interviewTarget: d.interviewTarget,
    itSignal: d.itSignal,
    landingSrc: lsrc,
    device: profileDevice(viewportWidth),
    country: c,
    priceRegion: profilePriceRegion(c),
    language: profileLanguage(params.get('lang'), navigatorLanguage),
    tzBucket: profileTzBucket(tzOffsetEastMin),
    landingBefore: keys.includes('sqlquest_aid') || keys.includes('sqlquest_landing_src'),
    readinessBand: profileReadinessBand(readinessRecord),
  };
}

/** A stored profile, whitelisted field by field (or null when unreadable). */
export function normalizeVisitorProfile(raw) {
  if (!raw || typeof raw !== 'object' || !PROFILE_DOORS.includes(raw.door)) return null;
  const str = (v, n = 64) => (typeof v === 'string' && v ? v.slice(0, n) : null);
  const oneOf = (v, list) => (list.includes(v) ? v : null);
  const c = isoCountry(raw.country);
  return {
    v: Number.isInteger(raw.v) ? raw.v : PROFILE_VERSION,
    door: raw.door,
    doorSrc: str(raw.doorSrc),
    company: slugify(raw.company),
    interviewTarget: raw.interviewTarget === true,
    itSignal: oneOf(raw.itSignal, PROFILE_IT_SIGNALS),
    landingSrc: str(raw.landingSrc),
    device: oneOf(raw.device, PROFILE_DEVICES),
    country: c,
    priceRegion: oneOf(raw.priceRegion, ['india', 'default']),
    language: typeof raw.language === 'string' && /^[a-z]{2,3}$/.test(raw.language) ? raw.language : null,
    tzBucket: oneOf(raw.tzBucket, PROFILE_TZ_BUCKETS),
    landingBefore: raw.landingBefore === true,
    readinessBand: oneOf(raw.readinessBand, PROFILE_READINESS_BANDS),
  };
}

/**
 * The stratum a profile puts a person in: interview-target (IT/NI) ×
 * desktop (D; also an unreadable device) or phone/tablet (M).
 */
export function tournamentStratum(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  return `${p.interviewTarget === true ? 'IT' : 'NI'}-${p.device === 'phone' || p.device === 'tablet' ? 'M' : 'D'}`;
}

/**
 * Is a routing entry usable? Its weights name active arms only, cover every
 * active arm with a weight > 0, and leave the winner at most
 * 1 − TOURNAMENT_MIN_EXPLORE.
 */
export function validStratumRouting(entry, arms = TOURNAMENT_ARMS) {
  if (!entry || typeof entry !== 'object' || !entry.weights || typeof entry.weights !== 'object') return false;
  if (!Number.isInteger(entry.version) || entry.version < 1) return false;
  const active = activeTournamentArms(arms).map(a => a.id);
  const names = Object.keys(entry.weights);
  if (!names.length || names.some(n => !active.includes(n))) return false;
  const ws = active.map(id => Number(entry.weights[id]));
  if (ws.some(w => !Number.isFinite(w) || w <= 0)) return false;
  const sum = ws.reduce((a, b) => a + b, 0);
  return Math.max(...ws) / sum <= 1 - TOURNAMENT_MIN_EXPLORE + 1e-9;
}

/**
 * The weights a stratum draws with: [{ entry, w }] over the active arms in
 * slot order (w sums to 1), the routing version (0 = equal) and whether it
 * is routed. An invalid or missing routing entry means equal weights.
 */
export function stratumWeights(stratum, { arms = TOURNAMENT_ARMS, routing = TOURNAMENT_STRATUM_WEIGHTS } = {}) {
  const active = activeTournamentArms(arms);
  const entry = stratum && routing ? routing[stratum] : null;
  if (active.length && validStratumRouting(entry, arms)) {
    const raw = active.map(a => Number(entry.weights[a.id]));
    const sum = raw.reduce((x, y) => x + y, 0);
    return { weights: active.map((a, i) => ({ entry: a, w: raw[i] / sum })), version: entry.version, routed: true };
  }
  return { weights: active.map(a => ({ entry: a, w: 1 / active.length })), version: 0, routed: false };
}

/**
 * The draw: u = hash(aid, stratum) / 2^32 into the stratum's cumulative
 * weights. Returns { entry, draw, weights, weightsVersion, routed } or null
 * (no aid, no active arm).
 */
export function tournamentDraw(aid, { stratum = null, arms = TOURNAMENT_ARMS, routing = TOURNAMENT_STRATUM_WEIGHTS } = {}) {
  if (aid == null || aid === '') return null;
  const sw = stratumWeights(stratum, { arms, routing });
  if (!sw.weights.length) return null;
  const u = tournamentHash(aid, stratum || '') / 4294967296;
  let acc = 0;
  let pick = sw.weights[sw.weights.length - 1].entry;
  for (const { entry, w } of sw.weights) {
    acc += w;
    if (u < acc) { pick = entry; break; }
  }
  const weights = Object.fromEntries(sw.weights.map(({ entry, w }) => [entry.id, Math.round(w * 1000) / 1000]));
  return { entry: pick, draw: u, weights, weightsVersion: sw.version, routed: sw.routed };
}

/** The registry entry an aid is assigned to (inside `stratum` when given). */
export function tournamentAssign(aid, arms = TOURNAMENT_ARMS, { stratum = null, routing = TOURNAMENT_STRATUM_WEIGHTS } = {}) {
  const d = tournamentDraw(aid, { stratum, arms, routing });
  return d ? d.entry : null;
}

const armLetter = (id) => String(id || '').split('_')[0];
const pct = (w) => `${Math.round(w * 100)}%`;

/**
 * The human sentence logged with every assignment, e.g.
 * "interview-target (Capital One page) · desktop → stratum IT-D; equal
 * weights A/B/D; hash draw 0.41 → B".
 */
export function tournamentReason({ profile = null, stratum = null, draw = null, weights = null, weightsVersion = 0, arm = null } = {}) {
  const p = profile || {};
  const co = companyDisplayName(p.company);
  let who;
  if (p.interviewTarget) {
    const why = {
      company_page: `${co || 'a company'} page`,
      company_link: `?company=${co || '?'} link`,
      readiness_door: `readiness test${co ? ` for ${co}` : ''}`,
      readiness_result: 'readiness result on this browser',
      capital_one_blog: 'Capital One blog',
    }[p.itSignal] || 'interview signal';
    who = `interview-target (${why}${p.door === 'ai' ? ', sent by an AI assistant' : ''})`;
  } else {
    const door = {
      sql_exercises: 'sql-exercises',
      topic: `topic page${p.doorSrc ? ` ${p.doorSrc}` : ''}`,
      question: 'question page',
      blog: `blog${p.doorSrc ? ` ${p.doorSrc}` : ''}`,
      homepage: 'homepage',
      ai: `AI assistant${p.landingSrc ? ` ${p.landingSrc.replace(/^ai:/, '')}` : ''}`,
      other_page: `page ${p.doorSrc || '?'}`,
      referrer: `referrer ${p.doorSrc ? p.doorSrc.replace(/^ref:/, '') : '?'}`,
      direct_unknown: 'direct / unknown',
      company_page: 'company page', company_link: 'company link', readiness: 'readiness',
    }[p.door] || 'unknown';
    who = `not interview-target (door: ${door})`;
  }
  const dev = p.device || 'device unknown, read as desktop';
  const ids = weights ? Object.keys(weights) : [];
  const ws = !ids.length ? 'no weights'
    : weightsVersion > 0
      ? `routed weights v${weightsVersion}: ${ids.slice().sort((a, b) => weights[b] - weights[a]).map(id => `${armLetter(id)} ${pct(weights[id])}`).join(' / ')}`
      : `equal weights ${ids.map(armLetter).join('/')}`;
  const d = Number.isFinite(draw) ? draw.toFixed(2) : '?';
  return `${who} · ${dev} → stratum ${stratum || '?'}; ${ws}; hash draw ${d} → ${armLetter(arm) || '?'}`;
}

/**
 * Fill the country (and its price region) into an enrolled record's profile
 * once /api/geo/ has answered — never anything else, never the stratum.
 * Returns the same record when there is nothing to fill.
 */
export function enrichTournamentProfile(record, { country = null } = {}) {
  const c = isoCountry(country);
  if (!c || !record || record.status !== 'enrolled' || !record.profile || record.profile.country) return record;
  return { ...record, profile: { ...record.profile, country: c, priceRegion: profilePriceRegion(c) } };
}

/** Has the app run in this browser before? (the holdout's rule, this key out) */
export function tournamentPriorAppUse(keys) {
  if (!Array.isArray(keys)) return false;
  return hasPriorAppUse(keys.filter(k => k !== TOURNAMENT_KEY));
}

/**
 * Which deep link, if any, keeps a first open out of the tournament.
 * `?interview=` goes to the Pro modal or the free mock in every arm (today's
 * behaviour); `?profile=` / `/u/<handle>` came to view someone else.
 */
export function tournamentExclusion({ search = '', pathname = '' } = {}) {
  const has = (name) => new RegExp(`[?&]${name}(=|&|$)`).test(String(search || ''));
  if (has('interview')) return 'excluded_interview_link';
  if (has('profile') || /^\/u\/[^/]+/.test(String(pathname || ''))) return 'excluded_profile';
  return null;
}

/** The stored record, or null when there is none (or it is unreadable). */
export function normalizeTournamentRecord(raw, arms = TOURNAMENT_ARMS) {
  if (!raw || typeof raw !== 'object' || !TOURNAMENT_RECORD_STATUSES.includes(raw.status)) return null;
  if (raw.status !== 'enrolled') {
    return { status: raw.status, arm: null, armVersion: null, round: null, slot: null, assignedAt: null, announced: false };
  }
  // An enrolled record must name a known arm — any status, since a retired
  // arm's people keep their record (the read is by the arm they got).
  const entry = tournamentArmById(raw.arm, arms);
  if (!entry) return null;
  const at = Number(raw.assignedAt);
  const v = Number(raw.armVersion);
  const r = Number(raw.round);
  return {
    status: 'enrolled',
    arm: entry.id,
    armVersion: Number.isInteger(v) && v > 0 ? v : entry.armVersion,
    round: Number.isInteger(r) && r > 0 ? r : entry.round,
    slot: Number.isInteger(raw.slot) ? raw.slot : entry.slot,
    assignedAt: Number.isFinite(at) && at > 0 ? at : null,
    announced: raw.announced === true,
    // Why this arm (2026-11-26): the profile read at the first open, the
    // stratum it named, the stratum's weights and the draw. A record written
    // before the profile existed (a preview walk) carries nulls here.
    stratum: TOURNAMENT_STRATA.includes(raw.stratum) ? raw.stratum : null,
    profile: normalizeVisitorProfile(raw.profile),
    weights: normalizeWeights(raw.weights),
    weightsVersion: Number.isInteger(raw.weightsVersion) && raw.weightsVersion >= 0 ? raw.weightsVersion : null,
    draw: Number.isFinite(raw.draw) && raw.draw >= 0 && raw.draw < 1 ? raw.draw : null,
    reason: typeof raw.reason === 'string' && raw.reason ? raw.reason.slice(0, 300) : null,
  };
}

function normalizeWeights(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const w = Number(v);
    if (/^[A-Za-z0-9_]{1,40}$/.test(k) && Number.isFinite(w) && w >= 0 && w <= 1) out[k] = w;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Decide, at the app's first open in this browser, whether it enters.
 * Called at module load, before the app writes anything.
 *
 *   flagOn       — FF `firstSessionTournament` === true
 *   record       — the stored record (any shape; normalised here)
 *   aid          — the browser's anonymous id
 *   now          — ms since epoch
 *   priorAppUse  — tournamentPriorAppUse(every localStorage key)
 *   search, pathname — window.location's, for the deep-link exclusions
 *   profile      — buildVisitorProfile(…) read at this open (the stratum
 *                  comes from it; a missing profile is read as an empty one:
 *                  not interview-target, desktop)
 *   routing      — the per-stratum weights (registry default)
 *
 * Returns { write, record }: `write` is the record to store now (null =
 * store nothing), `record` the browser's record after this call (or null).
 */
export function tournamentEnrolment({
  flagOn = false, record = null, aid = null, now = null, priorAppUse = false,
  search = '', pathname = '', profile = null, arms = TOURNAMENT_ARMS, routing = TOURNAMENT_STRATUM_WEIGHTS,
} = {}) {
  const stored = normalizeTournamentRecord(record, arms);
  if (stored) return { write: null, record: stored };
  if (!flagOn) return { write: null, record: null };
  const t = now == null ? NaN : Number(now);
  if (!Number.isFinite(t) || t <= 0) return { write: null, record: null };
  if (priorAppUse) {
    const r = normalizeTournamentRecord({ status: 'returning' }, arms);
    return { write: r, record: r };
  }
  const excluded = tournamentExclusion({ search, pathname });
  if (excluded) {
    const r = normalizeTournamentRecord({ status: excluded }, arms);
    return { write: r, record: r };
  }
  // Profile first, then the stratum, then the draw inside the stratum.
  const prof = normalizeVisitorProfile(profile) || buildVisitorProfile({});
  const stratum = tournamentStratum(prof);
  const d = tournamentDraw(aid, { stratum, arms, routing });
  if (!d) return { write: null, record: null };
  const entry = d.entry;
  const r = {
    status: 'enrolled',
    arm: entry.id,
    armVersion: entry.armVersion,
    round: entry.round,
    slot: entry.slot,
    assignedAt: t,
    announced: false,
    stratum,
    profile: prof,
    weights: d.weights,
    weightsVersion: d.weightsVersion,
    draw: d.draw,
    reason: tournamentReason({ profile: prof, stratum, draw: d.draw, weights: d.weights, weightsVersion: d.weightsVersion, arm: entry.id }),
  };
  return { write: r, record: r };
}

/**
 * Sign-in: the account's own enrolled record wins over this browser's — the
 * person was armed first there, and is never re-armed. Returns the record to
 * use and whether the browser's copy must be rewritten.
 */
export function adoptAccountRecord({ browserRecord = null, accountRecord = null, arms = TOURNAMENT_ARMS } = {}) {
  const acct = normalizeTournamentRecord(accountRecord, arms);
  const local = normalizeTournamentRecord(browserRecord, arms);
  if (!acct || acct.status !== 'enrolled') return { record: local, write: false };
  if (local && local.status === 'enrolled' && local.arm === acct.arm && local.armVersion === acct.armVersion) {
    return { record: local, write: false };
  }
  // Adopted: already announced on the device that assigned it.
  return { record: { ...acct, announced: true }, write: true };
}

/** The arm this browser's record names, or null when it is not enrolled. */
export function enrolledTournamentArm(record, arms = TOURNAMENT_ARMS) {
  const r = normalizeTournamentRecord(record, arms);
  return r && r.status === 'enrolled' ? r.arm : null;
}

/**
 * The arm this person is IN right now, or null (outside the tournament).
 * Flag off is the kill switch: everyone gets today's product.
 */
export function tournamentEffectiveArm({
  flagOn = false, record = null, signedIn = false, accountCreatedAt = null, intent = null, arms = TOURNAMENT_ARMS,
} = {}) {
  if (!flagOn) return null;
  const r = normalizeTournamentRecord(record, arms);
  if (!r || r.status !== 'enrolled') return null;
  if (intent === 'hired') return null;
  if (signedIn && accountCreatedAt != null && r.assignedAt != null) {
    const created = typeof accountCreatedAt === 'number' ? accountCreatedAt : Date.parse(accountCreatedAt);
    if (Number.isFinite(created) && created < r.assignedAt) return null;
  }
  return r.arm;
}

/**
 * The arm whose BEHAVIOUR to run: the arm itself once it is built, else
 * A_control (B and D in PR 1). null outside the tournament.
 */
export function tournamentBehaviour(armId, arms = TOURNAMENT_ARMS) {
  if (!armId) return null;
  const entry = tournamentArmById(armId, arms);
  if (!entry || entry.built !== true) return TOURNAMENT_CONTROL_ID;
  return entry.id;
}

/**
 * Does this person's arm replace the first-session A/Bs (firstScreen,
 * companyDirect, runnableStarter, mobileRunBar; plan §2.3)? Only a BUILT
 * challenger does — so in PR 1, never.
 */
export function tournamentSupersedes(armId, arms = TOURNAMENT_ARMS) {
  const b = tournamentBehaviour(armId, arms);
  return !!b && b !== TOURNAMENT_CONTROL_ID;
}

/** The fields every pro_events row from an enrolled browser carries. */
export function tournamentEventStamp({ flagOn = false, record = null, arms = TOURNAMENT_ARMS } = {}) {
  if (!flagOn) return {};
  const r = normalizeTournamentRecord(record, arms);
  return r && r.status === 'enrolled' ? { tArm: r.arm, tArmV: r.armVersion } : {};
}

/**
 * Should `tournament_assigned` fire now? Once per browser: an enrolled
 * record not yet announced, with the flag on.
 */
export function shouldAnnounceTournament({ flagOn = false, record = null, arms = TOURNAMENT_ARMS } = {}) {
  if (!flagOn) return false;
  const r = normalizeTournamentRecord(record, arms);
  return !!r && r.status === 'enrolled' && r.assignedAt != null && !r.announced;
}

/**
 * The `tournament_assigned` payload: the arm, and WHY — the stratum, the
 * profile, the weights, the draw and the reason sentence.
 * trackActivationEvent adds viewport, landingSrc, arrivalSrc, tz and the bot
 * stamp.
 */
export function tournamentAssignedPayload(record, arms = TOURNAMENT_ARMS) {
  const r = normalizeTournamentRecord(record, arms);
  if (!r || r.status !== 'enrolled') return null;
  return {
    test: TOURNAMENT_TEST_ID,
    arm: r.arm,
    armVersion: r.armVersion,
    round: r.round,
    slot: r.slot,
    firstOpenAt: r.assignedAt != null ? new Date(r.assignedAt).toISOString() : null,
    stratum: r.stratum,
    profile: r.profile,
    weights: r.weights,
    weightsVersion: r.weightsVersion,
    draw: r.draw != null ? Math.round(r.draw * 10000) / 10000 : null,
    reason: r.reason,
  };
}
