#!/usr/bin/env node
// The indexing queue (founder, 2026-11-23: "GSC ve Bing işleri için bir
// sıralama düzen oluştur, risk almayacak şekilde zamanla eklersin, önem
// sırasına göre"). Rules, written before use: docs/plans/indexing-queue-2026-11-23.md.
//
//   node scripts/index-queue.mjs --engine gsc                 today's list, repo only
//   node scripts/index-queue.mjs --engine gsc --live          + the preconditions, checked on https://sqlquest.app
//   node scripts/index-queue.mjs --engine bing --live         the by-hand Bing list (T1 changed today only)
//   node scripts/index-queue.mjs --engine gsc --days 7 --write-queue   the 7-day plan → docs/agent/index-queue.md
//   options: --date YYYY-MM-DD · --now <ISO> · --status <file.json> · --json <file> · --base <url>
//
// It never requests or submits anything. It reads the repo (public/sitemap.xml,
// src/data/sitemap-lastmod.json, src/data/index-tiers.json, src/data/seo-prune.json,
// src/data/feature-flags.js, docs/agent/fleet/state/S1.md, docs/agent/index-requests.json)
// and prints who goes first. With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set it
// also reads gsc_index_status / bing_url_status (read-only) and drops what is
// already indexed after its lastmod; without them it says so and skips that step.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export const SITE = 'https://sqlquest.app';
export const GSC_DAILY_CAP = 8;          // Google allows ~10; 2 are kept for emergencies
export const GSC_QUOTA = 10;
export const BING_HAND_CAP = 10;         // by hand, T1 changed today only; the API submitter does the rest
export const COOLDOWN_DAYS = 14;
export const ROLLING_WINDOW_MS = 24 * 3600e3;   // GSC's quota is a rolling window from the LAST request
export const DEPLOY_MIN_AGE_MS = 3600e3;
export const SITEWIDE_SHARE = 0.5;       // a lastmod day that moved more than half the sitemap is a site-wide change
export const LOG_KEYS = ['url', 'engine', 'date', 'by', 'result'];
export const LOG_RESULTS = ['requested', 'quota_exceeded', 'refused', 'already_indexed', 'unknown'];
export const ENGINES = ['gsc', 'bing'];

const DAY = 86400000;
const day = (iso) => String(iso || '').slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const toPath = (url) => { try { return new URL(url, SITE).pathname; } catch { return url; } };
export const toUrl = (p) => SITE + p;

// ---------------------------------------------------------------- inputs

export function parseSitemap(xml) {
  const out = new Map();
  for (const block of String(xml || '').split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (loc) out.set(toPath(loc), block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() || null);
  }
  return out;
}

/** A flag is on only when its key reads `true` in feature-flags.js. A missing key is OFF here. */
export function flagOn(flagsSource, name) {
  return new RegExp(`(^|[\\s{,])${name}\\s*:\\s*true\\b`, 'm').test(String(flagsSource || ''));
}

/** S1's state line `**Status:** Google GREEN · Bing RED`. Unknown → RED (fail safe). */
export function s1Status(stateMd) {
  const line = String(stateMd || '').match(/\*\*Status:\*\*([^\n]*)/)?.[1] || '';
  const read = (name) => line.match(new RegExp(`${name}\\s+(GREEN|AMBER|RED)`, 'i'))?.[1]?.toUpperCase()
    || line.match(/^\s*(GREEN|AMBER|RED)\b/i)?.[1]?.toUpperCase() || null;
  const g = read('Google'), b = read('Bing');
  return { gsc: g || 'RED', bing: b || 'RED', known: Boolean(g && b) };
}

export function tierClass(p, tiers) {
  if (p.startsWith('/questions/')) return 5;
  if ((tiers.t1 || []).includes(p)) return 1;
  if ((tiers.t2 || []).some(rx => new RegExp(rx).test(p))) return 2;
  if ((tiers.t3 || []).some(rx => new RegExp(rx).test(p))) return 3;
  return 4;
}

/** Days on which more than SITEWIDE_SHARE of the sitemap's lastmods moved (a footer, a shared partial). */
export function sitewideDays(lastmods) {
  const n = lastmods.size || 1;
  const count = {};
  for (const v of lastmods.values()) if (v) count[day(v)] = (count[day(v)] || 0) + 1;
  return new Set(Object.entries(count).filter(([, c]) => c / n > SITEWIDE_SHARE).map(([d]) => d));
}

/** Is a status row "indexed" for this engine? GSC: PASS / Submitted and indexed. Bing: crawled at all. */
export function isIndexed(row, engine) {
  if (!row) return null;
  if (engine === 'gsc') return row.verdict === 'PASS' || /indexed/i.test(row.coverage_state || '') && !/not indexed/i.test(row.coverage_state || '');
  return Boolean(row.last_crawled);
}

// ---------------------------------------------------------------- the log

/** Problems with the request log: unknown keys, an e-mail address anywhere, a bad engine/result/date. */
export function validateLog(log) {
  const errs = [];
  const text = JSON.stringify(log || {});
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) errs.push('the log contains an e-mail address');
  for (const [i, r] of (log?.requests || []).entries()) {
    const extra = Object.keys(r).filter(k => !LOG_KEYS.includes(k));
    if (extra.length) errs.push(`requests[${i}] carries ${extra.join(', ')} (only ${LOG_KEYS.join(', ')})`);
    if (!ENGINES.includes(r.engine)) errs.push(`requests[${i}] engine ${r.engine}`);
    if (!LOG_RESULTS.includes(r.result)) errs.push(`requests[${i}] result ${r.result}`);
    if (!/^\d{4}-\d{2}-\d{2}/.test(r.date || '')) errs.push(`requests[${i}] date ${r.date}`);
    if (!String(r.url || '').startsWith(SITE + '/')) errs.push(`requests[${i}] url ${r.url}`);
  }
  return errs;
}

// A refusal ("Quota Exceeded") costs no quota and is not a request.
const counts = (r) => r.result === 'requested' || r.result === 'unknown' || r.result === 'planned';
// A date-only entry is read as the END of that day (UTC): the conservative reading of a rolling window.
const at = (d) => Date.parse(/T/.test(d) ? d : `${d}T23:59:59Z`);

// ---------------------------------------------------------------- the rules

/**
 * Every sitemap URL (plus pending pages not yet in it), each either queued with
 * a rank or held with its reason. Pure: everything it knows is in `ctx`.
 */
export function evaluate(ctx) {
  const { engine, date, sitemap, tiers, prune = new Set(), flagsSource = '', log = { requests: [] }, status = null, s1 = { gsc: 'RED', bing: 'RED' }, live = null } = ctx;
  const wide = sitewideDays(sitemap);
  const pendingByPath = new Map((tiers.pending || []).map((e, i) => [e.path, { ...e, order: i }]));
  const reqs = (log.requests || []).filter(r => r.engine === engine && counts(r));
  const lastReq = {};
  for (const r of reqs) { const p = toPath(r.url); if (!lastReq[p] || at(r.date) > at(lastReq[p])) lastReq[p] = r.date; }
  const paths = new Set([...sitemap.keys(), ...pendingByPath.keys(), ...Object.keys(tiers.flagGated || {})]);
  const queued = [], held = [];
  const hold = (p, reason, tier) => held.push({ path: p, url: toUrl(p), tier, reason });

  for (const p of paths) {
    const cls = tierClass(p, tiers);
    if (engine === 'bing' && p.startsWith('/questions/')) { hold(p, 'questions-never-bing', cls); continue; }
    if (prune.has(p)) { hold(p, 'in-seo-prune', cls); continue; }
    if ((tiers.skip || []).includes(p)) { hold(p, 'on the skip list (index-tiers.json)', cls); continue; }
    const gateFlag = tiers.flagGated?.[p];
    if (gateFlag && !flagOn(flagsSource, gateFlag)) { hold(p, `flag-off:${gateFlag}`, cls); continue; }
    if (!sitemap.has(p)) { hold(p, 'not-in-sitemap', cls); continue; }
    const lastmod = sitemap.get(p);

    // The pending boost: until the page has been requested on this engine since it was added, and only with its gate open.
    let pend = pendingByPath.get(p) || null;
    if (pend && lastReq[p] && day(lastReq[p]) >= pend.added) pend = null;
    let gateNote = null;
    if (pend?.gate?.flag && !flagOn(flagsSource, pend.gate.flag)) { gateNote = `pending gate: ${pend.gate.flag} off`; pend = null; }
    if (pend?.gate?.liveMarker) {
      const seen = live?.[p]?.markerSeen?.[pend.gate.liveMarker];
      if (seen !== true) { gateNote = `pending gate: "${pend.gate.liveMarker}" not seen live${live ? '' : ' (no --live)'}`; pend = null; }
    }

    const row = status ? status[p] : null;
    const indexed = status ? isIndexed(row, engine) : null;
    let tier = cls;
    if (pend) tier = pend.tier ?? Math.min(cls, 2);
    else if (cls === 2 && indexed !== false) tier = 4;   // a class-2 page counts as T2 only when new to the engine

    const last = lastReq[p];
    if (last && Date.parse(`${date}T00:00:00Z`) - Date.parse(`${day(last)}T00:00:00Z`) < COOLDOWN_DAYS * DAY) { hold(p, `cooldown: requested ${day(last)}`, tier); continue; }
    if (last && !pend && lastmod && lastmod <= day(last)) { hold(p, `unchanged since the request of ${day(last)}`, tier); continue; }
    if (indexed && row?.last_crawled && lastmod && day(row.last_crawled) >= lastmod) { hold(p, `indexed, crawled ${day(row.last_crawled)} ≥ lastmod ${lastmod}`, tier); continue; }
    if (tier !== 1 && !pend && indexed !== false && wide.has(lastmod)) { hold(p, `only a site-wide change (${lastmod})${gateNote ? '; ' + gateNote : ''}`, tier); continue; }
    if (tier >= 3 && s1[engine] === 'RED') { hold(p, `S1 RED on ${engine}: T3/T4 paused`, tier); continue; }
    if (engine === 'bing') {
      if (tier !== 1) { hold(p, 'bing by hand: T1 only (the API submitter does the rest)', tier); continue; }
      if (lastmod !== date) { hold(p, `bing by hand: lastmod ${lastmod} is not today`, tier); continue; }
      if (!pend && wide.has(lastmod)) { hold(p, 'bing by hand: a site-wide change only (IndexNow already sent it)', tier); continue; }
    }
    const lv = live?.[p];
    if (lv && lv.problems.length) { hold(p, `live: ${lv.problems.join('; ')}`, tier); continue; }

    queued.push({
      path: p, url: toUrl(p), tier, lastmod, pending: Boolean(pend), order: pend ? pend.order : tier === 1 ? 1e5 + (tiers.t1 || []).indexOf(p) : 1e6,
      why: pend ? `pending: ${pend.source}` : indexed === false ? `not indexed (${row?.coverage_state || 'no row'})` : !last ? `T${tier}, changed ${lastmod}, never requested` : `T${tier}, changed ${lastmod} since ${day(last)}`,
      indexed, neverRequested: !last, live: lv ? 'ok' : 'not checked', gateNote,
    });
  }
  queued.sort((a, b) => a.tier - b.tier
    || (b.pending - a.pending) || a.order - b.order
    || (a.indexed === false ? 0 : 1) - (b.indexed === false ? 0 : 1)
    || (b.neverRequested - a.neverRequested)
    || String(b.lastmod).localeCompare(String(a.lastmod))
    || a.path.localeCompare(b.path));
  return { queued, held };
}

/** How many requests today may carry, and from when (GSC's rolling 24-hour window). */
export function allowance({ engine, date, log = { requests: [] }, now = null }) {
  const mine = (log.requests || []).filter(r => r.engine === engine);
  if (mine.some(r => r.result === 'quota_exceeded' && day(r.date) === date)) return { cap: 0, stop: 'Quota Exceeded today: stop for the day' };
  const cap = engine === 'gsc' ? GSC_DAILY_CAP : BING_HAND_CAP;
  const done = mine.filter(r => counts(r) && day(r.date) === date).length;
  let notBefore = null;
  if (engine === 'gsc') {
    const prior = mine.filter(r => counts(r) && day(r.date) < date).map(r => at(r.date));
    if (prior.length) {
      const nb = Math.max(...prior) + ROLLING_WINDOW_MS;
      if (nb > Date.parse(`${date}T00:00:00Z`)) notBefore = new Date(nb).toISOString();
    }
    if (notBefore && now && Date.parse(now) < Date.parse(notBefore)) return { cap: 0, notBefore, stop: `the last batch was less than 24 h ago: not before ${notBefore}` };
  }
  return { cap: Math.max(0, cap - done), notBefore };
}

/** Today's list: the queue, cut to the day's allowance. */
export function pickDay(ctx) {
  const { queued, held } = evaluate(ctx);
  const a = allowance(ctx);
  return { date: ctx.date, engine: ctx.engine, ...a, picks: queued.slice(0, a.cap), waiting: queued.slice(a.cap), held };
}

/** N days ahead: each day's picks are logged as `planned` before the next day is cut. Live checks apply to day 1 only. */
export function planDays(ctx, days = 7) {
  const out = [];
  let log = { requests: [...(ctx.log?.requests || [])] };
  for (let i = 0; i < days; i++) {
    const d = addDays(ctx.date, i);
    const res = pickDay({ ...ctx, date: d, log, live: i === 0 ? ctx.live : null, now: i === 0 ? ctx.now : null });
    out.push(res);
    // A planned batch is assumed to run at the same time of day as this run (S1's slot).
    const tod = /T/.test(ctx.now || '') ? ctx.now.slice(10) : 'T16:00:00Z';
    log = { requests: [...log.requests, ...res.picks.map(p => ({ url: p.url, engine: ctx.engine, date: d + tod, by: 'plan', result: 'planned' }))] };
  }
  return out;
}

// ---------------------------------------------------------------- live preconditions

function robotsNoindex(text, engine) {
  const bot = engine === 'gsc' ? 'googlebot' : 'bingbot';
  return String(text || '').split(/,(?=\s*[a-z-]+\s*:)/i).some(part => {
    const m = part.match(/^\s*([a-z-]+)\s*:(.*)$/i);
    if (m && !/^(noindex|nofollow|none|max-|unavailable_after)/i.test(m[1])) return m[1].toLowerCase() === bot && /noindex|none/i.test(m[2]);
    return /noindex|none/i.test(part);
  });
}

/** The day-of checks for one page. Returns { problems, markerSeen }. Plain GETs, no redirect following. */
// The deploy's age comes from the last commit on origin/main that touched public/
// (Vercel deploys it within minutes), or --deployed-at. Not from Last-Modified:
// on Vercel that header is the edge cache's fill time, measured 2026-11-23 at
// "0 min ago" on a deploy merged five hours earlier.
export async function liveCheck(p, { engine, fetchImpl = fetch, base = SITE, liveSitemap = null, markers = [], now = Date.now(), deployedAt = null } = {}) {
  const problems = [];
  const markerSeen = {};
  let res;
  try { res = await fetchImpl(base + p, { redirect: 'manual' }); } catch (e) { return { problems: [`fetch failed: ${e.message}`], markerSeen }; }
  if (res.status !== 200) problems.push(`HTTP ${res.status}${res.headers?.get?.('location') ? ' → ' + res.headers.get('location') : ''}`);
  const xr = res.headers?.get?.('x-robots-tag');
  if (xr && robotsNoindex(xr, engine)) problems.push(`X-Robots-Tag: ${xr}`);
  if (!deployedAt || !Number.isFinite(Date.parse(deployedAt))) problems.push('deploy age unknown (fetch origin/main or pass --deployed-at)');
  else if (now - Date.parse(deployedAt) < DEPLOY_MIN_AGE_MS) problems.push(`deployed ${Math.round((now - Date.parse(deployedAt)) / 60000)} min ago (< 60)`);
  const html = res.status === 200 ? await res.text() : '';
  for (const m of html.matchAll(/<meta\s+name="(robots|googlebot|bingbot)"\s+content="([^"]*)"/gi)) {
    const who = m[1].toLowerCase();
    if ((who === 'robots' || who === (engine === 'gsc' ? 'googlebot' : 'bingbot')) && /noindex|none/i.test(m[2])) problems.push(`meta ${who}: ${m[2]}`);
  }
  const canon = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  if (res.status === 200 && canon !== base + p) problems.push(`canonical ${canon || 'missing'}`);
  if (liveSitemap && !liveSitemap.has(p)) problems.push('not in the live sitemap.xml');
  for (const mk of markers) markerSeen[mk] = html.includes(mk);
  return { problems, markerSeen };
}

// ---------------------------------------------------------------- output

export function renderDay(res, { title = true } = {}) {
  const L = [];
  if (title) L.push(`### ${res.date} · ${res.engine.toUpperCase()} · ${res.picks.length} of cap ${res.cap}${res.notBefore ? ` · not before ${res.notBefore.slice(0, 16).replace('T', ' ')} UTC` : ''}`, '');
  if (res.stop) L.push(`**Stop:** ${res.stop}`, '');
  if (!res.picks.length) L.push('_Nothing to request._', '');
  res.picks.forEach((p, i) => L.push(`${i + 1}. T${p.tier} \`${p.url}\` — ${p.why}${p.live === 'ok' ? ' · live ✓' : ' · live: check on the day'}`));
  if (res.picks.length) L.push('');
  return L.join('\n');
}

/** Pending pages whose gate is still closed: what they wait for. */
export function gateWaits(tiers, flagsSource) {
  const out = [];
  for (const e of tiers.pending || []) {
    if (!e.gate) continue;
    const waits = [];
    if (e.gate.flag && !flagOn(flagsSource, e.gate.flag)) waits.push(`flag ${e.gate.flag} on`);
    if (e.gate.liveMarker) waits.push(`"${e.gate.liveMarker}" live on the page`);
    out.push(`- \`${e.path}\` (T${e.tier}, ${e.source}): waits for ${waits.join(' and ')}`);
  }
  return out.join('\n');
}

export function renderHeld(held, { limit = 40 } = {}) {
  const groups = {};
  for (const h of held) { const k = h.reason.split(/\s*[(:]|\s\d{4}-/)[0].trim(); (groups[k] ||= []).push(h); }
  const L = ['| Held because | Pages | Examples |', '|---|---|---|'];
  for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
    L.push(`| ${k} | ${v.length} | ${v.slice(0, 3).map(h => `\`${h.path}\``).join(', ')}${v.length > 3 ? ' …' : ''} |`);
  }
  return L.slice(0, limit + 2).join('\n');
}

// ---------------------------------------------------------------- CLI

function arg(argv, name, dflt = null) { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt; }

async function readStatus({ argv, env, fetchImpl, root, engine, log }) {
  const file = arg(argv, '--status');
  if (file) {
    const j = JSON.parse(fs.readFileSync(path.resolve(root, file), 'utf8'));
    return { status: j[engine] || {}, note: `index status: ${j.read || `${file}, undated`}` };
  }
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseAuthHeaders } = await import('./gsc/auth.mjs');
    const { restAll } = await import('./bing/api.mjs');
    const table = engine === 'gsc' ? 'gsc_index_status?select=url,verdict,coverage_state,last_crawled' : 'bing_url_status?select=url,last_crawled,http_status';
    const rows = await restAll(table, { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders });
    return { status: Object.fromEntries(rows.map(r => [toPath(r.url), r])), note: `index status from ${table.split('?')[0]} (${rows.length} rows)` };
  }
  log('note: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set and no --status file: the "already indexed after lastmod" step is skipped.');
  return { status: null, note: 'no index status: the "already indexed after lastmod" step was skipped' };
}

export function readRepo(root) {
  const r = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const prune = JSON.parse(r('src/data/seo-prune.json'));
  return {
    sitemap: parseSitemap(r('public/sitemap.xml')),
    tiers: JSON.parse(r('src/data/index-tiers.json')),
    prune: new Set((prune.noindex || []).map(toPath)),
    flagsSource: r('src/data/feature-flags.js'),
    s1: s1Status(r('docs/agent/fleet/state/S1.md')),
    log: JSON.parse(r('docs/agent/index-requests.json')),
  };
}

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, root = process.cwd() } = {}) {
  const engine = arg(argv, '--engine', 'gsc');
  if (!ENGINES.includes(engine)) throw new Error(`--engine gsc|bing, not ${engine}`);
  const now = arg(argv, '--now', new Date().toISOString());
  const date = arg(argv, '--date', day(now));
  const days = Number(arg(argv, '--days', '1'));
  const base = arg(argv, '--base', SITE);
  const repo = readRepo(root);
  const errs = validateLog(repo.log);
  if (errs.length) throw new Error(`docs/agent/index-requests.json: ${errs.join('; ')}`);
  const { status, note } = await readStatus({ argv, env, fetchImpl, root, engine, log });

  let live = null;
  if (argv.includes('--live')) {
    // Check every page the repo-only pass would queue today, and every gated pending page.
    const pre = evaluate({ ...repo, engine, date, status, live: null });
    const gated = (repo.tiers.pending || []).filter(e => e.gate?.liveMarker).map(e => e.path);
    const targets = [...new Set([...pre.queued.slice(0, 40).map(q => q.path), ...gated, ...Object.keys(repo.tiers.flagGated || {}).filter(p => flagOn(repo.flagsSource, repo.tiers.flagGated[p]))])];
    let deployedAt = arg(argv, '--deployed-at');
    if (!deployedAt) {
      try { deployedAt = execFileSync('git', ['log', '-1', '--format=%cI', 'origin/main', '--', 'public/'], { cwd: root, encoding: 'utf8' }).trim() || null; } catch { deployedAt = null; }
    }
    const smRes = await fetchImpl(base + '/sitemap.xml');
    const liveSitemap = smRes.ok ? parseSitemap(await smRes.text()) : new Map();
    live = {};
    for (const p of targets) {
      const markers = (repo.tiers.pending || []).filter(e => e.path === p && e.gate?.liveMarker).map(e => e.gate.liveMarker);
      live[p] = await liveCheck(p, { engine, fetchImpl, base, liveSitemap, markers, now: Date.parse(now), deployedAt });
    }
  }

  const ctx = { ...repo, engine, date, now, status, live };
  const plan = planDays(ctx, days);
  const md = [
    `## Indexing queue · ${engine.toUpperCase()} · from ${date}`, '',
    `S1: Google ${repo.s1.gsc} · Bing ${repo.s1.bing}${repo.s1.known ? '' : ' (status line missing: read as RED)'} · ${note} · live checks: ${live ? `${Object.keys(live).length} pages` : 'not run (pass --live on the day)'}`, '',
    ...plan.map(d => renderDay(d)),
    '#### Waiting on a gate (joins the queue on the first day the gate is open, checked with --live)', '', gateWaits(repo.tiers, repo.flagsSource), '',
    '#### Held on day 1', '', renderHeld(plan[0].held), '',
  ].join('\n');
  log(md);
  const json = { engine, from: date, s1: repo.s1, statusNote: note, live: Boolean(live), days: plan.map(d => ({ date: d.date, cap: d.cap, notBefore: d.notBefore || null, stop: d.stop || null, picks: d.picks.map(({ url, tier, why, live: lv }) => ({ url, tier, why, live: lv })) })), held: plan[0].held };
  const jsonOut = arg(argv, '--json');
  if (jsonOut) fs.writeFileSync(path.resolve(root, jsonOut), JSON.stringify(json, null, 2) + '\n');
  if (argv.includes('--write-queue')) fs.writeFileSync(path.join(root, 'docs/agent/index-queue.md'), renderQueueDoc({ md, date, written: day(now) }));
  return { plan, json, md };
}

export function renderQueueDoc({ md, date, written = date }) {
  return [
    '# Indexing queue — generated', '',
    `Written by \`node scripts/index-queue.mjs --engine gsc --days 7 --write-queue\` on ${written}, for the days from ${date}. Rules: \`docs/plans/indexing-queue-2026-11-23.md\`.`,
    'Re-generated every day by S1 (with `--live`), so day 1 is the only binding line; days 2–7 are the order as it stands today.',
    'Nothing here has been requested. Results go into `docs/agent/index-requests.json`.', '',
    md,
  ].join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
