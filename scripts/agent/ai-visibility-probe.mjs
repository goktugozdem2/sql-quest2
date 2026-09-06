#!/usr/bin/env node
/**
 * AI-visibility probe — asks four answer engines the prompt panel and records,
 * per answer, whether SQL Quest is named, where it ranks among the sites named,
 * which URLs were cited (ours vs third-party), and which competitors appeared.
 *
 * WHY THIS EXISTS (2026-09-06)
 * ----------------------------
 * The AI-assistant recommendation channel is the only channel that has
 * produced a paying user — both payers arrived through the `home` door, and
 * payer #2 wrote that Gemini sent him for "analytics prep" — and it is
 * invisible in our own data: in 60 days, zero arrivals stamped from
 * chatgpt / perplexity / gemini / copilot / claude. AI apps strip referrers,
 * `?src=home` on the CTA overwrote whatever utm ChatGPT had appended, and
 * Gemini sends neither. `landingSrc` (metrics.md → `landing_src_split`) will
 * read the traffic side once it ships; this probe reads the OTHER side —
 * what the engines actually say when a real question is asked — which no
 * traffic stamp can ever show, because a recommendation that nobody clicks
 * leaves no row.
 *
 * WHAT IT IS NOT
 * --------------
 * A ranking tool. Temperature 0 does not make a search-grounded answer
 * deterministic; the same prompt on two days can cite two different pages.
 * The metric is the share across the whole panel, per lane, and the read is
 * the trend over weeks — the task spec (tasks/ai-visibility.md) says what a
 * single week's swing is worth (not much).
 *
 * KEYS
 * ----
 * Read from the environment only: one key per lane (see the .env template
 * in install-vps.sh — the fleet's run.sh exports .env before the task runs).
 * A missing key means that lane is SKIPPED and says so in the output; it is
 * never a failed run. The probe never prints a key, redacts anything
 * key-shaped from every line it emits, sends keys in headers only (never in a
 * URL, which lands in logs), and FAILS CLOSED — exit 3 before any request —
 * if a key value or a key-shaped string is found in a tracked file of the
 * repo or in this process's argv. A key pasted into a prompt file, a task
 * spec or a report is a key on GitHub.
 *
 * COST
 * ----
 * HARD_MAX_PROMPTS x 4 lanes per run, temperature 0, short max tokens, one
 * request at a time per lane, one retry on 429/5xx, a lane aborts after three
 * consecutive failures and stops at its wall-clock budget. A panel above the
 * cap is refused, not trimmed: the panel is the metric's denominator, and a
 * silent trim is a metric that changed without anyone deciding it should.
 *
 * USAGE
 * -----
 *   node scripts/agent/ai-visibility-probe.mjs                 # full run, JSON to stdout
 *   node scripts/agent/ai-visibility-probe.mjs --dry-run       # panel + request shapes, NO network
 *   node scripts/agent/ai-visibility-probe.mjs --lanes gemini,perplexity
 *   node scripts/agent/ai-visibility-probe.mjs --max-prompts 3 # a cheap smoke, first 3 prompts
 *   node scripts/agent/ai-visibility-probe.mjs --summary out.json   # ALSO write the summary block to a file
 *                                                                   # (skipped when no lane ran — see main())
 *
 * Exit codes: 0 ran (skipped lanes and per-prompt errors are IN the output,
 * not exit codes) · 2 usage / panel error · 3 refused: credential in the repo.
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_PANEL = join(ROOT, 'scripts', 'agent', 'prompts', 'ai-visibility.json');
const HARD_MAX_PROMPTS = 30;
const SCHEMA = 'ai-visibility/1';

// One lane per vendor. `env` is the ONLY place the variable name is used for
// anything but --help; every line the probe emits refers to the lane by name,
// because guard.sh fails a diff that carries an API-key variable name and the
// task pastes this output into docs/reads/.
const LANES = {
  gemini: {
    env: 'GEMINI_API_KEY',
    build(prompt, cfg, key) {
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          // Search grounding on: the whole question is what the engine says
          // WITH the web in front of it, the way a user sees it.
          tools: [{ google_search: {} }],
          generationConfig: { temperature: cfg.temperature, maxOutputTokens: cfg.maxOutputTokens },
        },
      };
    },
    parse(json) {
      const cand = json?.candidates?.[0] || {};
      const text = (cand.content?.parts || []).map((p) => p.text || '').join('\n');
      // groundingChunks[].web.uri is a vertexaisearch redirect, not the page;
      // the title usually carries the host. hostOf() below prefers the title
      // for that one domain — the redirect tells you nothing about who got cited.
      const cites = (cand.groundingMetadata?.groundingChunks || [])
        .filter((c) => c.web)
        .map((c) => ({ url: c.web.uri, title: c.web.title || null, via: 'grounding' }));
      return { text, cites };
    },
  },
  openai: {
    env: 'OPENAI_API_KEY',
    build(prompt, cfg, key) {
      return {
        url: 'https://api.openai.com/v1/responses',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: {
          model: cfg.model,
          input: prompt,
          tools: [{ type: cfg.tool || 'web_search' }],
          temperature: cfg.temperature,
          max_output_tokens: cfg.maxOutputTokens,
        },
      };
    },
    parse(json) {
      const parts = [];
      const cites = [];
      for (const item of json?.output || []) {
        if (item.type !== 'message') continue;
        for (const c of item.content || []) {
          if (c.type !== 'output_text') continue;
          parts.push(c.text || '');
          for (const a of c.annotations || []) {
            if (a.type === 'url_citation' && a.url) cites.push({ url: a.url, title: a.title || null, via: 'citation' });
          }
        }
      }
      return { text: parts.join('\n'), cites };
    },
  },
  anthropic: {
    env: 'ANTHROPIC_API_KEY',
    build(prompt, cfg, key) {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: {
          model: cfg.model,
          max_tokens: cfg.maxOutputTokens,
          temperature: cfg.temperature,
          tools: [{ type: cfg.tool || 'web_search_20250305', name: 'web_search', max_uses: cfg.maxSearches || 3 }],
          messages: [{ role: 'user', content: prompt }],
        },
      };
    },
    parse(json) {
      const parts = [];
      const cites = [];
      for (const block of json?.content || []) {
        if (block.type === 'text') {
          parts.push(block.text || '');
          for (const c of block.citations || []) {
            if (c.url) cites.push({ url: c.url, title: c.title || null, via: 'citation' });
          }
        } else if (block.type === 'web_search_tool_result') {
          // Results the model looked at, cited or not. Kept apart from
          // citations: seen is not the same as recommended.
          for (const r of Array.isArray(block.content) ? block.content : []) {
            if (r.url) cites.push({ url: r.url, title: r.title || null, via: 'search_result' });
          }
        }
      }
      return { text: parts.join('\n'), cites };
    },
  },
  perplexity: {
    env: 'PERPLEXITY_API_KEY',
    build(prompt, cfg, key) {
      return {
        url: 'https://api.perplexity.ai/chat/completions',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: {
          model: cfg.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: cfg.temperature,
          max_tokens: cfg.maxOutputTokens,
        },
      };
    },
    parse(json) {
      const text = json?.choices?.[0]?.message?.content || '';
      const cites = [];
      for (const u of json?.citations || []) if (typeof u === 'string') cites.push({ url: u, title: null, via: 'citation' });
      for (const r of json?.search_results || []) if (r?.url) cites.push({ url: r.url, title: r.title || null, via: 'search_result' });
      return { text, cites };
    },
  },
};

// ---------------------------------------------------------------- args ----
function parseArgs(argv) {
  const args = { dryRun: false, lanes: null, maxPrompts: null, summary: null, panel: DEFAULT_PANEL, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) usage(`${a} needs a value`); return v; };
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--lanes') args.lanes = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--max-prompts') args.maxPrompts = Number(next());
    else if (a === '--summary') args.summary = next();
    else if (a === '--panel') args.panel = resolve(next());
    else if (a === '-h' || a === '--help') args.help = true;
    else usage(`unknown argument: ${a}`);
  }
  return args;
}

function usage(msg) {
  if (msg) process.stderr.write(`ai-visibility-probe: ${msg}\n`);
  process.stderr.write(
    `usage: ai-visibility-probe.mjs [--dry-run] [--lanes a,b] [--max-prompts N] [--summary FILE] [--panel FILE]\n` +
    `lanes: ${Object.keys(LANES).join(', ')} — each needs its key in the environment ` +
    `(${Object.values(LANES).map((l) => l.env).join(', ')}); a lane with no key is skipped, never fatal.\n`,
  );
  process.exit(msg ? 2 : 0);
}

// ------------------------------------------------------------ secrets ----
// Anything that looks like a vendor key. Used (a) to refuse a panel or a
// tracked file that carries one and (b) to scrub every line we print.
const KEY_SHAPES = /(sk-ant-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|pplx-[A-Za-z0-9]{20,}|eyJhbGciOi[A-Za-z0-9_.-]{20,})/g;

function makeRedactor(liveKeys) {
  const values = liveKeys.filter((k) => k && k.length >= 8);
  return (s) => {
    let out = String(s);
    for (const v of values) out = out.split(v).join('<redacted>');
    return out.replace(KEY_SHAPES, '<redacted>');
  };
}

const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.md', '.html', '.css', '.sh',
  '.sql', '.txt', '.yml', '.yaml', '.toml', '.env', '.xml', '.svg', '.map', '']);
const SCAN_MAX_BYTES = 4 * 1024 * 1024;

function trackedFiles() {
  try {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\0').filter(Boolean);
  } catch {
    // Not a git checkout (a copied tree). Scan the two places a pasted key
    // would land rather than nothing.
    const list = [];
    for (const dir of ['scripts/agent', 'docs']) {
      try {
        list.push(...execFileSync('find', [join(ROOT, dir), '-type', 'f'], { encoding: 'utf8' })
          .split('\n').filter(Boolean).map((p) => p.slice(ROOT.length + 1)));
      } catch { /* nothing to scan there */ }
    }
    return list;
  }
}

// Fail closed: a live key value, or anything key-shaped, inside the repo.
// Reports the FILE, never the value. Exit 3 so run.sh's log shows a refusal
// distinct from a usage error.
function refuseIfKeyInRepo(liveKeys, panelPath) {
  const offenders = [];
  const argvJoined = process.argv.slice(2).join(' ');
  for (const k of liveKeys) if (k && argvJoined.includes(k)) offenders.push('<process argv>');
  const files = trackedFiles();
  const panelRel = panelPath.startsWith(ROOT) ? panelPath.slice(ROOT.length + 1) : panelPath;
  if (!files.includes(panelRel)) files.push(panelPath);
  for (const f of files) {
    const abs = f.startsWith('/') ? f : join(ROOT, f);
    if (!TEXT_EXT.has(extname(f).toLowerCase())) continue;
    let size = 0;
    try { size = statSync(abs).size; } catch { continue; }
    if (size > SCAN_MAX_BYTES) continue;
    let body;
    try { body = readFileSync(abs, 'utf8'); } catch { continue; }
    for (const k of liveKeys) if (k && k.length >= 8 && body.includes(k)) { offenders.push(f); break; }
    // The panel itself must be clean of anything key-shaped even when no key
    // is live in this environment — a dry run on a laptop must catch it too.
    if ((f === panelRel || abs === panelPath) && KEY_SHAPES.test(body)) offenders.push(`${f} (key-shaped string)`);
  }
  if (offenders.length) {
    process.stderr.write(
      `REFUSED: a credential (or something shaped like one) is inside the repo: ${[...new Set(offenders)].join(', ')}.\n` +
      `Rotate it — the copy you can see is not the only one — then remove it. Nothing was requested.\n`,
    );
    process.exit(3);
  }
}

// -------------------------------------------------------------- panel ----
function loadPanel(path) {
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch (e) { usage(`cannot read panel ${path}: ${e.message}`); }
  let panel;
  try { panel = JSON.parse(raw); } catch (e) { usage(`panel is not valid JSON: ${e.message}`); }
  const prompts = Array.isArray(panel.prompts) ? panel.prompts : [];
  if (prompts.length === 0) usage('panel has no prompts');
  const cap = Math.min(HARD_MAX_PROMPTS, Number(panel.caps?.maxPrompts) || HARD_MAX_PROMPTS);
  if (prompts.length > cap) {
    usage(`panel has ${prompts.length} prompts, cap is ${cap} (${prompts.length} x 4 lanes = ${prompts.length * 4} requests). ` +
      `Trim the panel; the probe does not trim it for you — the panel is the metric's denominator.`);
  }
  const ids = new Set();
  for (const p of prompts) {
    if (!p.id || !p.text || !p.family || !p.lang) usage(`prompt missing id/text/family/lang: ${JSON.stringify(p).slice(0, 80)}`);
    if (ids.has(p.id)) usage(`duplicate prompt id ${p.id}`);
    ids.add(p.id);
  }
  return { panel, sha256: createHash('sha256').update(raw).digest('hex') };
}

// ----------------------------------------------------------- analysis ----
function hostOf(url, title) {
  let host = null;
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { host = null; }
  // Gemini grounding chunks point at a redirect; the title is the host.
  if (host && host.endsWith('vertexaisearch.cloud.google.com') && title && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(title.trim())) {
    host = title.trim().toLowerCase().replace(/^www\./, '');
  }
  return host;
}

function classifyHost(host, panel) {
  if (!host) return 'unknown';
  const ours = panel.ours.host.toLowerCase();
  if (host === ours || host.endsWith(`.${ours}`)) return 'ours';
  for (const site of panel.sites) {
    for (const h of site.hosts || []) if (host === h || host.endsWith(`.${h}`)) return `competitor:${site.name}`;
  }
  for (const [cls, hosts] of Object.entries(panel.thirdPartyClasses || {})) {
    for (const h of hosts) if (host === h || host.endsWith(`.${h}`)) return cls;
  }
  return 'other';
}

function compile(patterns) {
  return patterns.map((p) => new RegExp(p, 'i'));
}

function analyse(text, cites, panel) {
  const oursRe = compile(panel.ours.patterns);
  const sitesRe = panel.sites.map((s) => ({ name: s.name, res: compile(s.patterns) }));
  const firstIndex = (res) => {
    let best = -1;
    for (const re of res) {
      const m = re.exec(text);
      if (m && (best === -1 || m.index < best)) best = m.index;
    }
    return best;
  };
  const named = [];
  const oursAt = firstIndex(oursRe);
  if (oursAt >= 0) named.push({ name: panel.ours.name, at: oursAt });
  for (const s of sitesRe) {
    const at = firstIndex(s.res);
    if (at >= 0) named.push({ name: s.name, at });
  }
  named.sort((a, b) => a.at - b.at);
  const sitesNamed = named.map((n) => n.name);
  const citedClassified = cites.map((c) => {
    const host = hostOf(c.url, c.title);
    return { url: c.url, host, cls: classifyHost(host, panel), via: c.via };
  });
  const citedOurs = citedClassified.filter((c) => c.cls === 'ours' && c.via !== 'search_result');
  const mentionedInText = oursAt >= 0;
  return {
    mentioned: mentionedInText || citedOurs.length > 0,
    mentionedInText,
    citedOurs: citedOurs.length > 0,
    rank: mentionedInText ? sitesNamed.indexOf(panel.ours.name) + 1 : null,
    sitesNamed,
    competitors: sitesNamed.filter((n) => n !== panel.ours.name),
    cited: citedClassified,
  };
}

// ------------------------------------------------------------ network ----
async function request(req, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify(req.body), signal: ctrl.signal });
    const bodyText = await res.text();
    let json = null;
    try { json = JSON.parse(bodyText); } catch { /* keep text for the error */ }
    return { status: res.status, json, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askOnce(lane, cfg, prompt, key, timeoutMs, redact) {
  const req = LANES[lane].build(prompt.text, cfg, key);
  const t0 = Date.now();
  let last = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await request(req, timeoutMs);
      if (r.status >= 200 && r.status < 300 && r.json) {
        const parsed = LANES[lane].parse(r.json);
        return { ok: true, ...parsed, latencyMs: Date.now() - t0, attempts: attempt };
      }
      last = `HTTP ${r.status}: ${redact((r.json && (r.json.error?.message || r.json.message)) || r.bodyText).slice(0, 240)}`;
      const retryable = r.status === 429 || r.status >= 500;
      if (!retryable) break;
      await sleep(r.status === 429 ? 10000 : 3000);
    } catch (e) {
      last = e.name === 'AbortError' ? `timeout after ${timeoutMs}ms` : redact(e.message);
      await sleep(3000);
    }
  }
  return { ok: false, error: last, latencyMs: Date.now() - t0 };
}

async function runLane(lane, cfg, prompts, key, panel, caps, redact) {
  const answers = [];
  const started = Date.now();
  let consecutiveFailures = 0;
  let aborted = null;
  for (const p of prompts) {
    if (aborted) {
      answers.push({ promptId: p.id, family: p.family, lang: p.lang, lane, status: 'skipped', reason: aborted });
      continue;
    }
    if (Date.now() - started > caps.laneBudgetMs) {
      aborted = `lane budget of ${caps.laneBudgetMs}ms exhausted`;
      answers.push({ promptId: p.id, family: p.family, lang: p.lang, lane, status: 'skipped', reason: aborted });
      continue;
    }
    const r = await askOnce(lane, cfg, p, key, caps.requestTimeoutMs, redact);
    if (!r.ok) {
      consecutiveFailures += 1;
      answers.push({ promptId: p.id, family: p.family, lang: p.lang, lane, status: 'error', error: r.error, latencyMs: r.latencyMs });
      if (consecutiveFailures >= 3) aborted = `aborted after 3 consecutive failures (last: ${r.error})`;
      continue;
    }
    consecutiveFailures = 0;
    const a = analyse(r.text, r.cites, panel);
    answers.push({
      promptId: p.id, family: p.family, lang: p.lang, lane, status: 'ok',
      model: cfg.model, latencyMs: r.latencyMs, attempts: r.attempts,
      mentioned: a.mentioned, mentionedInText: a.mentionedInText, citedOurs: a.citedOurs, rank: a.rank,
      sitesNamed: a.sitesNamed, competitors: a.competitors, cited: a.cited,
      textSha256: createHash('sha256').update(r.text).digest('hex'),
      excerpt: redact(r.text).slice(0, 1200),
    });
    await sleep(400);
  }
  return { answers, aborted };
}

// ------------------------------------------------------------ summary ----
function summarise(answers, laneStates, panel, prompts) {
  const perLane = {};
  const competitorNames = panel.sites.map((s) => s.name);
  for (const lane of Object.keys(LANES)) {
    const rows = answers.filter((a) => a.lane === lane);
    const ok = rows.filter((a) => a.status === 'ok');
    const mentioned = ok.filter((a) => a.mentioned);
    const rankDist = { 1: 0, 2: 0, 3: 0, '4+': 0, 'cited only': 0 };
    for (const a of mentioned) {
      if (a.rank === null) rankDist['cited only'] += 1;
      else if (a.rank >= 4) rankDist['4+'] += 1;
      else rankDist[a.rank] += 1;
    }
    const byFamily = {};
    const byLang = {};
    for (const a of ok) {
      byFamily[a.family] ??= { answered: 0, mentioned: 0 };
      byFamily[a.family].answered += 1; if (a.mentioned) byFamily[a.family].mentioned += 1;
      byLang[a.lang] ??= { answered: 0, mentioned: 0 };
      byLang[a.lang].answered += 1; if (a.mentioned) byLang[a.lang].mentioned += 1;
    }
    const citedOurUrls = {};
    const thirdParty = {};
    const thirdPartyHosts = {};
    const competitorHosts = {};
    for (const a of ok) {
      const seen = new Set();
      for (const c of a.cited) {
        if (c.via === 'search_result') continue;              // seen, not cited
        const k = `${c.cls}|${c.host}|${c.url}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (c.cls === 'ours') {
          let path = c.url;
          try { path = new URL(c.url).pathname || '/'; } catch { /* redirect uri: keep as is */ }
          if (c.host && !c.url.includes(c.host)) path = `(via redirect) ${c.host}`;
          citedOurUrls[path] = (citedOurUrls[path] || 0) + 1;
        } else if (c.cls.startsWith('competitor:')) {
          competitorHosts[c.host] = (competitorHosts[c.host] || 0) + 1;
        } else {
          thirdParty[c.cls] = (thirdParty[c.cls] || 0) + 1;
          if (c.host) thirdPartyHosts[c.host] = (thirdPartyHosts[c.host] || 0) + 1;
        }
      }
    }
    const competitorMentions = {};
    for (const name of competitorNames) {
      const n = ok.filter((a) => a.competitors.includes(name)).length;
      if (n > 0) competitorMentions[name] = { answers: n, share: ok.length ? +(n / ok.length).toFixed(3) : null };
    }
    perLane[lane] = {
      status: laneStates[lane].status,
      model: laneStates[lane].model || null,
      reason: laneStates[lane].reason || null,
      asked: rows.length,
      answered: ok.length,
      errored: rows.filter((a) => a.status === 'error').length,
      skipped: rows.filter((a) => a.status === 'skipped').length,
      mentioned: mentioned.length,
      mentionedInText: ok.filter((a) => a.mentionedInText).length,
      citedOurs: ok.filter((a) => a.citedOurs).length,
      // ai_mention_share: mentioned / answered, per lane. Answered, not asked:
      // an errored prompt is a prompt nobody answered, and it is reported
      // beside the share rather than folded into it as a silent zero.
      mentionShare: ok.length ? +(mentioned.length / ok.length).toFixed(3) : null,
      rankDistribution: rankDist,
      byFamily, byLang,
      citedOurUrls: sortDesc(citedOurUrls),
      thirdPartyCited: sortDesc(thirdParty),
      thirdPartyHosts: sortDesc(thirdPartyHosts, 15),
      competitorHostsCited: sortDesc(competitorHosts),
      competitorMentions,
    };
  }
  const allOk = answers.filter((a) => a.status === 'ok');
  return {
    prompts: prompts.length,
    families: countBy(prompts, 'family'),
    langs: countBy(prompts, 'lang'),
    overall: {
      answered: allOk.length,
      mentioned: allOk.filter((a) => a.mentioned).length,
      mentionShare: allOk.length ? +(allOk.filter((a) => a.mentioned).length / allOk.length).toFixed(3) : null,
    },
    perLane,
  };
}

function sortDesc(obj, limit = 50) {
  return Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit));
}
function countBy(list, key) {
  const out = {};
  for (const x of list) out[x[key]] = (out[x[key]] || 0) + 1;
  return out;
}

// ---------------------------------------------------------------- main ----
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) usage();

  const { panel, sha256 } = loadPanel(args.panel);
  const caps = {
    temperature: Number(panel.caps?.temperature ?? 0),
    maxOutputTokens: Number(panel.caps?.maxOutputTokens ?? 450),
    requestTimeoutMs: Number(panel.caps?.requestTimeoutMs ?? 45000),
    laneBudgetMs: Number(panel.caps?.laneBudgetMs ?? 20 * 60 * 1000),
  };
  let prompts = panel.prompts;
  if (args.maxPrompts !== null) {
    if (!Number.isInteger(args.maxPrompts) || args.maxPrompts < 1) usage('--max-prompts must be a positive integer');
    prompts = prompts.slice(0, args.maxPrompts);
  }
  const laneNames = args.lanes || Object.keys(LANES);
  for (const l of laneNames) if (!LANES[l]) usage(`unknown lane ${l}; lanes are ${Object.keys(LANES).join(', ')}`);

  const liveKeys = Object.values(LANES).map((l) => process.env[l.env] || '').filter(Boolean);
  const redact = makeRedactor(liveKeys);
  refuseIfKeyInRepo(liveKeys, args.panel);

  const laneStates = {};
  for (const lane of Object.keys(LANES)) {
    const cfg = { ...caps, ...(panel.lanes?.[lane] || {}) };
    if (!laneNames.includes(lane)) laneStates[lane] = { status: 'skipped', reason: 'not selected (--lanes)', model: cfg.model };
    else if (!process.env[LANES[lane].env]) laneStates[lane] = { status: 'skipped', reason: `no key for lane ${lane} in the environment (optional; see the .env template in install-vps.sh)`, model: cfg.model };
    else laneStates[lane] = { status: args.dryRun ? 'dry-run' : 'pending', model: cfg.model };
    laneStates[lane].cfg = cfg;
  }

  const base = {
    schema: SCHEMA,
    ranAt: new Date().toISOString(),
    dryRun: args.dryRun,
    panel: { file: args.panel.startsWith(ROOT) ? args.panel.slice(ROOT.length + 1) : args.panel, version: panel.version || null, sha256, prompts: prompts.length, promptsInPanel: panel.prompts.length },
    caps,
  };

  if (args.dryRun) {
    // The shapes, with the key slot named but empty. No network.
    const requests = {};
    for (const lane of Object.keys(LANES)) {
      const shape = LANES[lane].build(prompts[0].text, laneStates[lane].cfg, '<key for this lane, from the environment>');
      requests[lane] = shape;
    }
    const out = {
      ...base,
      lanes: Object.fromEntries(Object.entries(laneStates).map(([k, v]) => [k, { status: v.status, model: v.model, reason: v.reason || null }])),
      prompts,
      requestShapes: requests,
      note: 'dry run: nothing was sent. Lane status shows which keys this environment holds; a missing key is a skipped lane, not a failed run.',
    };
    process.stdout.write(redact(JSON.stringify(out, null, 2)) + '\n');
    return;
  }

  const active = Object.keys(LANES).filter((l) => laneStates[l].status === 'pending');
  const results = await Promise.all(active.map(async (lane) => {
    const key = process.env[LANES[lane].env];
    const r = await runLane(lane, laneStates[lane].cfg, prompts, key, panel, caps, redact);
    const ok = r.answers.filter((a) => a.status === 'ok').length;
    laneStates[lane].status = ok > 0 ? (r.aborted ? 'partial' : 'ok') : 'error';
    laneStates[lane].reason = r.aborted || (ok === 0 ? (r.answers.find((a) => a.error)?.error || 'no answer') : null);
    return r.answers;
  }));
  const answers = results.flat();
  for (const lane of Object.keys(LANES)) {
    if (laneStates[lane].status === 'skipped') {
      for (const p of prompts) answers.push({ promptId: p.id, family: p.family, lang: p.lang, lane, status: 'skipped', reason: laneStates[lane].reason });
    }
  }

  const summary = summarise(answers, laneStates, panel, prompts);
  const couldNotRead = [];
  for (const [lane, st] of Object.entries(laneStates)) {
    if (st.status !== 'ok') couldNotRead.push({ lane, status: st.status, reason: st.reason });
  }
  for (const a of answers) if (a.status === 'error') couldNotRead.push({ lane: a.lane, promptId: a.promptId, status: 'error', reason: a.error });

  const out = {
    ...base,
    lanes: Object.fromEntries(Object.entries(laneStates).map(([k, v]) => [k, { status: v.status, model: v.model, reason: v.reason || null }])),
    summary,
    couldNotRead,
    answers,
  };
  const text = redact(JSON.stringify(out, null, 2));
  process.stdout.write(text + '\n');
  // 2026-09-06 review: the sidecar was written unconditionally, so a fleet
  // with no engine key (the README's recommended starting state) landed a
  // 3.6 KB four-lanes-skipped summary in docs/reads/ every Tuesday — inside
  // the allowlist, so guard.sh and build:check passed and run.sh opened a
  // PR containing nothing but "skipped". The task spec tells the agent to
  // write nothing when no lane ran and to leave this file as the probe
  // wrote it, and the agent cannot edit this script, so the gate has to be
  // here. No lane ran → no sidecar → an empty diff → run.sh's "no changes
  // proposed" exit, no PR.
  if (args.summary) {
    if (active.length > 0) {
      const s = { schema: SCHEMA, ranAt: base.ranAt, panel: base.panel, lanes: out.lanes, summary, couldNotRead };
      writeFileSync(args.summary, redact(compactSummary(s)) + '\n');
    } else {
      process.stderr.write('ai-visibility-probe: no lane ran (no keys); summary not written\n');
    }
  }
}

// The summary sidecar is committed next to the report (docs/reads/), and
// guard.sh caps a run at 400 changed lines across ALL files. Pretty-printed,
// the summary alone was 293 lines for a 4-prompt smoke — a full panel plus
// the report would abort every run. So: one line per top-level key, one line
// per lane, one line per could-not-read entry. Still diffable by lane, still
// JSON.parse-able, under 30 lines.
function compactSummary(s) {
  const lines = ['{'];
  const keys = Object.keys(s);
  keys.forEach((k, i) => {
    const comma = i < keys.length - 1 ? ',' : '';
    if (k === 'summary') {
      const { perLane, ...rest } = s.summary;
      const restKeys = Object.keys(rest);
      lines.push(`  "summary": {`);
      restKeys.forEach((rk) => lines.push(`    ${JSON.stringify(rk)}: ${JSON.stringify(rest[rk])},`));
      lines.push(`    "perLane": {`);
      const laneKeys = Object.keys(perLane);
      laneKeys.forEach((lk, li) => lines.push(`      ${JSON.stringify(lk)}: ${JSON.stringify(perLane[lk])}${li < laneKeys.length - 1 ? ',' : ''}`));
      lines.push(`    }`);
      lines.push(`  }${comma}`);
    } else if (Array.isArray(s[k]) && s[k].length) {
      lines.push(`  ${JSON.stringify(k)}: [`);
      s[k].forEach((row, ri) => lines.push(`    ${JSON.stringify(row)}${ri < s[k].length - 1 ? ',' : ''}`));
      lines.push(`  ]${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(s[k])}${comma}`);
    }
  });
  lines.push('}');
  return lines.join('\n');
}

main().catch((e) => {
  process.stderr.write(`ai-visibility-probe: ${String(e && e.stack || e).replace(KEY_SHAPES, '<redacted>')}\n`);
  process.exit(2);
});
