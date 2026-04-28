#!/usr/bin/env node
//
// scripts/tag-challenges-by-sector.js
//
// Sector MVP — auto-tag every challenge with sector affinity. Output goes
// to src/data/sector-tags.json. The Coach engine (`prioritizeBySector`)
// reads that file at module init and uses it to nudge sector-flavored
// challenges to the front of the queue for users whose Goals Mentor
// flagged a sector preference.
//
// Two modes:
//
//   node scripts/tag-challenges-by-sector.js
//     Deterministic mode. Pure rule-based keyword matching against title +
//     description + tables. Free, instant, deterministic. Catches the
//     obvious cases (challenges that explicitly mention transactions /
//     orders / fraud / property / mortgage) and tags everything else as
//     "generic". Recommended for the first pass.
//
//   ANTHROPIC_API_KEY=... node scripts/tag-challenges-by-sector.js --llm
//     LLM-augmented mode. Runs deterministic first, then asks Claude
//     Haiku for the entries that came back as "generic" only. The model
//     gets the description + tables and picks zero-or-more sectors, with
//     "generic" as the explicit fallback. ~$0.001 per challenge — about
//     $0.25 for the whole 245-challenge bank.
//
// We always merge the two: deterministic results NEVER lose. The LLM
// can ADD sectors but not REMOVE rule-based ones. (Reason: rule-based
// tags come from explicit keyword matches; the LLM is doing inference.
// Trust the explicit signal more.)
//
// Output shape (src/data/sector-tags.json):
//   {
//     "1":   ["generic"],
//     "9":   ["e-ticaret", "generic"],
//     "12":  ["finans"],
//     ...
//   }
//
// Re-run is safe and idempotent. If you tweak rules below, re-run to
// regenerate. Manual edits to sector-tags.json get blown away — instead,
// add the rule to this file so the next regen keeps it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHALLENGES_FILE = path.join(ROOT, 'src/data/challenges.js');
const OUTPUT_JSON = path.join(ROOT, 'src/data/sector-tags.json');
const OUTPUT_JS = path.join(ROOT, 'src/data/sector-tags.js');

const args = new Set(process.argv.slice(2));
const USE_LLM = args.has('--llm');

// ─── Step 1: Load challenges via vm sandbox ──────────────────────────
//
// challenges.js writes to `window.challengesData` because it's loaded as
// a plain script in the browser, not an ES module. We mimic the browser
// shape with a stubbed `window` and run the file in a sandbox.

function loadChallenges() {
  if (!existsSync(CHALLENGES_FILE)) {
    throw new Error(`challenges.js not found at ${CHALLENGES_FILE}`);
  }
  const src = readFileSync(CHALLENGES_FILE, 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const challenges = sandbox.window.challengesData;
  if (!Array.isArray(challenges)) {
    throw new Error('window.challengesData missing or not an array after eval');
  }
  return challenges;
}

// ─── Step 2: Deterministic rule-based tagger ─────────────────────────
//
// Order matters: more specific sectors checked first so e.g. "mortgage
// listings agent" lands as gayrimenkul, not finans (mortgage-only).
//
// Match strategy: lowercase the joined searchable text once, then check
// each keyword group as a regex word-boundary match. Word boundaries
// avoid false positives like "card" matching "cards" or "carding".

const SECTOR_KEYWORDS = {
  // Real estate FIRST — most specific signal in mixed text.
  gayrimenkul: [
    'real estate', 'realtor', 'real-estate',
    'property', 'properties',
    'listing', 'listings',
    'rental', 'rent', 'lease', 'leasing',
    'house', 'apartment', 'condo',
    'realty',
    'airbnb', 'vrbo', 'zillow', 'redfin',
    'mortgage', // also matches finans below; gayrimenkul wins because checked first
    'broker', 'agent fee',
    'square footage', 'square feet', 'sqft',
  ],

  'e-ticaret': [
    'e-commerce', 'ecommerce', 'e commerce',
    'marketplace', 'marketplaces',
    'amazon', 'shopify', 'magento', 'etsy', 'ebay',
    'cart', 'shopping cart', 'basket', 'baskets',
    'checkout', 'order', 'orders', 'order_items',
    'sku', 'inventory',
    'product catalog', 'products table',
    'wishlist', 'review', 'reviews',
    'shipped', 'delivery', 'returns',
    'sessionization', // common e-com pattern
  ],

  finans: [
    'bank', 'banking', 'bankers',
    'fintech',
    'fraud', 'anti-fraud', 'fraud detection',
    'transaction', 'transactions',
    'payment', 'payments', 'paypal', 'stripe',
    'credit card', 'debit card', 'card',
    'loan', 'loans', 'lending',
    'investment', 'portfolio', 'trading',
    'hedge fund', 'hedge-fund',
    'insurance', 'underwriting',
    'currency', 'forex',
    'mrr', 'arr', 'revenue cohort',
    'subscription', // SaaS revenue is finans-adjacent
  ],
};

function matchKeywords(text, keywords) {
  for (const kw of keywords) {
    // Escape regex special chars; match as substring with case-insensitive.
    // Word boundary on alpha-only kws; raw substring on multi-word phrases.
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = /^[a-z][a-z0-9 -]*[a-z0-9]$/.test(kw)
      ? new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i')
      : new RegExp(escaped, 'i');
    if (re.test(text)) return true;
  }
  return false;
}

function deterministicTag(challenge) {
  const text = [
    challenge.title || '',
    challenge.description || '',
    (challenge.tables || []).join(' '),
    challenge.category || '',
    (challenge.skills || []).join(' '),
  ].join(' ').toLowerCase();

  const tags = [];
  // Order: gayrimenkul first (most specific in overlap with finans),
  // e-ticaret second, finans last.
  if (matchKeywords(text, SECTOR_KEYWORDS.gayrimenkul)) tags.push('gayrimenkul');
  if (matchKeywords(text, SECTOR_KEYWORDS['e-ticaret'])) tags.push('e-ticaret');
  if (matchKeywords(text, SECTOR_KEYWORDS.finans)) tags.push('finans');
  if (tags.length === 0) tags.push('generic');
  return tags;
}

// ─── Step 3 (optional): LLM augmentation ─────────────────────────────
//
// Only runs if --llm flag passed AND ANTHROPIC_API_KEY env is set. Sends
// challenges that came back as ["generic"] only — those are the most
// likely to have a missed sector signal that pure keywords didn't catch.
// The model can ADD sectors; if it returns only ["generic"] we keep the
// original tag.

const LLM_SYSTEM_PROMPT = `You are tagging SQL practice challenges by which industry sector(s) the example data fits best. Return JSON only.

Sectors:
- "finans": banking, fintech, payments, fraud, transactions, loans, investments, insurance, MRR/ARR cohorts
- "e-ticaret": online retail, marketplaces, orders, baskets, products/SKUs, conversion funnels
- "gayrimenkul": real estate, property listings, agents, leases, time-on-market
- "generic": no clear sector signal, fits any domain

A challenge can have MULTIPLE sectors if its data shape genuinely fits more than one (e.g. customer-cohort retention works for both e-ticaret and finans). MOST challenges will be "generic" because their schemas (passengers, movies, employees) don't carry sector signal — only tag a sector when the challenge's TEXT explicitly references that sector's domain.

Return ONLY this JSON, no prose:
{"id": <challenge_id>, "sectors": [...one or more from the list above...]}`;

async function llmTag(challenge) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const userPrompt = `Challenge ${challenge.id}: "${challenge.title}"
Difficulty: ${challenge.difficulty}
Category: ${challenge.category}
Tables: ${(challenge.tables || []).join(', ')}
Description: ${challenge.description}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: LLM_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!resp.ok) {
      console.warn(`  ! LLM call failed for ${challenge.id}: HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    const text = data?.content?.[0]?.text || '';
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '');
    }
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed.sectors) && parsed.sectors.length > 0) {
      return parsed.sectors.filter(
        (s) => ['finans', 'e-ticaret', 'gayrimenkul', 'generic'].includes(s)
      );
    }
  } catch (err) {
    console.warn(`  ! LLM error for ${challenge.id}:`, err.message);
  }
  return null;
}

// ─── Step 4: Run ─────────────────────────────────────────────────────

async function main() {
  console.log('Loading challenges...');
  const challenges = loadChallenges();
  console.log(`Loaded ${challenges.length} challenges.\n`);

  const tags = {};
  const counts = { finans: 0, 'e-ticaret': 0, gayrimenkul: 0, generic: 0 };
  let llmCallsMade = 0;

  for (const ch of challenges) {
    if (!ch || typeof ch.id === 'undefined') continue;

    let detTags = deterministicTag(ch);

    // LLM augmentation only for challenges that came out generic-only.
    if (USE_LLM && detTags.length === 1 && detTags[0] === 'generic') {
      const llmResult = await llmTag(ch);
      llmCallsMade++;
      if (llmResult && llmResult.length > 0) {
        // If LLM returned non-generic tags, replace. If LLM returned only
        // generic, keep the deterministic generic.
        const nonGeneric = llmResult.filter((s) => s !== 'generic');
        if (nonGeneric.length > 0) {
          detTags = [...new Set([...nonGeneric, 'generic'])];
        }
      }
      // Light rate-limit: 100ms between Anthropic calls
      await new Promise((r) => setTimeout(r, 100));
    }

    tags[String(ch.id)] = detTags;
    detTags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });

    const summary = detTags.join(', ');
    console.log(`  #${ch.id.toString().padStart(3, ' ')}  [${summary}]  ${ch.title}`);
  }

  // Sort keys numerically before write so the JSON is diff-friendly.
  const sortedKeys = Object.keys(tags).sort((a, b) => Number(a) - Number(b));
  const sortedTags = {};
  for (const k of sortedKeys) sortedTags[k] = tags[k];

  // JSON for human inspection + git diffs.
  writeFileSync(OUTPUT_JSON, JSON.stringify(sortedTags, null, 2) + '\n', 'utf8');

  // JS shim for the data bundle. Browser-side code reads
  // window.SECTOR_TAGS[challengeId] to look up sectors at runtime.
  const jsHeader = `// SQL Quest — Challenge sector tags (generated)
//
// DO NOT EDIT BY HAND. This file is auto-generated by
// scripts/tag-challenges-by-sector.js. Re-run that script to regenerate.
//
// Maps challenge id → array of sector ids the challenge fits. Used by
// Coach engine (prioritizeBySector) and AI Tutor sector context.

window.SECTOR_TAGS = `;
  writeFileSync(OUTPUT_JS, jsHeader + JSON.stringify(sortedTags, null, 2) + ';\n', 'utf8');

  console.log(`\nTagged ${challenges.length} challenges:`);
  for (const sec of ['finans', 'e-ticaret', 'gayrimenkul', 'generic']) {
    console.log(`  ${sec.padEnd(12)} ${counts[sec] || 0}`);
  }
  console.log(`\nWrote ${OUTPUT_JSON}`);
  console.log(`Wrote ${OUTPUT_JS}`);
  if (USE_LLM) console.log(`LLM calls made: ${llmCallsMade}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
