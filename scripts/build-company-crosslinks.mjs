#!/usr/bin/env node
/**
 * Company-page cross-links.
 *
 * The 17 /{company}-sql-interview/ pages had zero links between them — an
 * isolated cluster. That's the same orphan problem that kept the 4 fintech
 * pages out of both indexes for a week: a sitemap entry is discovery, an
 * internal link is the crawl signal. It's also a real UX gap, since almost
 * nobody interviews at exactly one company.
 *
 * Each page gets 5 links: up to 3 from its own sector, the rest from adjacent
 * sectors, plus one link to the hub. Topical clusters, not a link farm —
 * "prepping for Plaid, also see Stripe/Wise/Revolut" is a claim a reader can
 * check, which is what makes the link worth following (and worth counting).
 *
 * Idempotent: re-running replaces the existing block rather than stacking.
 * Run: node scripts/build-company-crosslinks.mjs   (then `npm run build`)
 */

import fs from 'fs';
import path from 'path';

const SRC = new URL('../src/', import.meta.url).pathname;

// Descriptors are lifted from each page's own <title>, not invented.
const COMPANIES = {
  amazon:     { name: 'Amazon',     sector: 'bigtech',   desc: 'BIE and analyst patterns, e-commerce metrics' },
  google:     { name: 'Google',     sector: 'bigtech',   desc: 'L3–L6 analyst and engineer patterns' },
  meta:       { name: 'Meta',       sector: 'bigtech',   desc: 'Window functions, aggregations, date logic' },
  apple:      { name: 'Apple',      sector: 'bigtech',   desc: 'Services and product analytics' },
  netflix:    { name: 'Netflix',    sector: 'bigtech',   desc: 'A/B testing, churn, streaming sessions' },

  stripe:     { name: 'Stripe',     sector: 'fintech',   desc: 'MRR, churn, payment analytics' },
  plaid:      { name: 'Plaid',      sector: 'fintech',   desc: 'Transaction dedup, NULL-safe aggregation' },
  ramp:       { name: 'Ramp',       sector: 'fintech',   desc: 'Spend analytics, vendor rankings' },
  revolut:    { name: 'Revolut',    sector: 'fintech',   desc: 'Cohort retention, running balances' },
  wise:       { name: 'Wise',       sector: 'fintech',   desc: 'Cross-border corridors, fee analysis' },
  jpmorgan:   { name: 'JPMorgan',   sector: 'fintech',   desc: 'Risk analytics, regulatory reporting' },

  uber:       { name: 'Uber',       sector: 'consumer',  desc: 'Marketplace supply/demand, two-sided retention' },
  airbnb:     { name: 'Airbnb',     sector: 'consumer',  desc: 'Booking funnels, host retention' },
  shopify:    { name: 'Shopify',    sector: 'consumer',  desc: 'GMV, merchant retention, funnels' },
  spotify:    { name: 'Spotify',    sector: 'consumer',  desc: 'Sessionization, listener analytics' },

  nvidia:     { name: 'NVIDIA',     sector: 'datainfra', desc: 'Telemetry rollups, rolling averages, top-N' },
  openai:     { name: 'OpenAI',     sector: 'ailab',     desc: 'Usage cohorts, retention, sessionization' },
  anthropic:  { name: 'Anthropic',  sector: 'ailab',     desc: 'Usage percentiles, event hygiene, growth' },
  tesla:      { name: 'Tesla',      sector: 'industrial',desc: 'Defect rates, sensor rollups, moving averages' },
  'morgan-stanley': { name: 'Morgan Stanley', sector: 'fintech', desc: 'Running P&L, risk buckets, reconciliation' },
  databricks: { name: 'Databricks', sector: 'datainfra', desc: 'Spark SQL, ETL, Delta Lake' },
  snowflake:  { name: 'Snowflake',  sector: 'datainfra', desc: 'Warehouse patterns, 95 runnable questions' },
};

// Who reads as "adjacent" to whom, in the order we'd recommend them.
const ADJACENT = {
  // datainfra leads for bigtech deliberately. It was a two-page sector that
  // nothing else reached, so left later in this list it collected one inbound
  // link total — and the recommendation stands up on its own: big-tech data
  // candidates genuinely interview at Databricks, Snowflake and NVIDIA.
  bigtech:    ['ailab', 'datainfra', 'consumer', 'fintech'],
  // industrial leads for consumer: Tesla is a one-page sector, so anywhere
  // later in a list it collects zero inbound and the orphan check fails.
  // The pairing is honest — consumer-analytics candidates and Tesla's
  // ops/manufacturing analytics both live on funnels, cohorts and rollups.
  consumer:   ['industrial', 'bigtech', 'ailab', 'fintech'],
  fintech:    ['bigtech', 'industrial', 'consumer', 'datainfra'],
  datainfra:  ['ailab', 'industrial', 'bigtech', 'fintech'],
  // AI labs and industrial are small sectors; point them at big tech first
  // (where their candidates overlap most) and give them each other next.
  ailab:      ['bigtech', 'datainfra', 'consumer', 'fintech'],
  industrial: ['datainfra', 'bigtech', 'fintech', 'consumer'],
};

const LINKS_PER_PAGE = 5;
const START = '<!-- related-companies:start -->';
const END = '<!-- related-companies:end -->';

const bySector = (s) => Object.keys(COMPANIES).filter(k => COMPANIES[k].sector === s);

// Walk a list as a ring starting just after `from`. Picking "the first N of
// the sector" instead left the tail of every sector with zero inbound links —
// netflix, wise and jpmorgan received none, which is precisely the state this
// script exists to fix. Rotating guarantees every page is somebody's neighbour.
function ring(list, from, n) {
  const out = [];
  for (let i = 1; out.length < n && i <= list.length; i++) {
    const k = list[(from + i) % list.length];
    if (k !== list[from]) out.push(k);
  }
  return out;
}

function relatedFor(slug) {
  const { sector } = COMPANIES[slug];
  const own = bySector(sector);
  const picked = ring(own, own.indexOf(slug), Math.min(3, own.length - 1));

  // Stagger where each page enters the adjacent sector, for the same reason.
  const offset = Object.keys(COMPANIES).indexOf(slug);
  for (const adj of ADJACENT[sector]) {
    const pool = bySector(adj);
    for (let i = 0; i < pool.length && picked.length < LINKS_PER_PAGE; i++) {
      const k = pool[(offset + i) % pool.length];
      if (k !== slug && !picked.includes(k)) picked.push(k);
    }
    if (picked.length >= LINKS_PER_PAGE) break;
  }
  return picked.slice(0, LINKS_PER_PAGE);
}

// Muted greys only. The accent yellow is reserved for CTAs, XP, streaks and
// win states (DESIGN.md) — a navigation block is none of those. Classes are
// the page's own (.sec/.sl/.fd/.qc) so this inherits the local system rather
// than introducing a parallel one.
function block(slug) {
  const cards = relatedFor(slug).map(k => {
    const c = COMPANIES[k];
    return `      <a class="qc" href="/${k}-sql-interview/" style="display:block;text-decoration:none;">
        <p class="fd" style="font-size:15px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${c.name}</p>
        <p style="font-size:12px;color:#64748b;line-height:1.6;">${c.desc}</p>
      </a>`;
  }).join('\n');

  return `${START}
<section id="related" style="border-top:1px solid rgba(255,255,255,.04);">
  <style>#related a.qc:hover{border-color:rgba(255,255,255,.18)}</style>
  <div class="sec" style="padding:72px 24px;">
    <p class="sl" style="color:#64748b;text-align:center;margin-bottom:10px;">Keep prepping</p>
    <h2 class="fd" style="font-size:28px;font-weight:800;text-align:center;color:#e2e8f0;margin-bottom:10px;">Other companies that ask similar SQL</h2>
    <p style="font-size:14px;color:#64748b;text-align:center;max-width:580px;margin:0 auto 36px;line-height:1.7;">Loops reuse the same handful of patterns. Prepping for two at once costs far less than twice the work.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
${cards}
    </div>
    <p style="text-align:center;margin-top:28px;">
      <a href="/sql-interview-prep/" style="font-size:13px;color:#94a3b8;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.12);padding-bottom:2px;">See all company question sets &rarr;</a>
    </p>
  </div>
</section>
${END}`;
}

let changed = 0;
const inbound = {};
for (const slug of Object.keys(COMPANIES)) {
  const file = path.join(SRC, `${slug}-sql-interview.html`);
  if (!fs.existsSync(file)) {
    console.error(`  MISSING ${slug}-sql-interview.html — skipped`);
    continue;
  }
  let html = fs.readFileSync(file, 'utf-8');

  // Idempotent: drop any previous block before inserting the new one.
  const existing = new RegExp(`${START}[\\s\\S]*?${END}\\n?`, 'g');
  html = html.replace(existing, '');

  const anchor = '<section class="cs">';
  if (!html.includes(anchor)) {
    console.error(`  NO ANCHOR in ${slug} — expected ${anchor}; skipped`);
    continue;
  }
  html = html.replace(anchor, `${block(slug)}\n${anchor}`);
  fs.writeFileSync(file, html);
  relatedFor(slug).forEach(k => { inbound[k] = (inbound[k] || 0) + 1; });
  changed++;
}

console.log(`\n${changed}/${Object.keys(COMPANIES).length} company pages linked (${LINKS_PER_PAGE} outbound each).`);
console.log('Inbound links received:');
for (const [k, n] of Object.entries(inbound).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(2)}  ${k}`);
}
// A page with zero inbound links is the exact defect this script fixes, so
// shipping one is a failure, not a warning.
const orphans = Object.keys(COMPANIES).filter(k => !inbound[k]);
if (orphans.length) {
  console.error(`\nFAILED — still orphaned (zero inbound): ${orphans.join(', ')}`);
  process.exit(1);
}
console.log(`\nNo orphans: every page receives ${Math.min(...Object.values(inbound))}+ inbound links.`);
