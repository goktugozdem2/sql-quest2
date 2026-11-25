#!/usr/bin/env node
// Pins the upstream AI-crawler list (ai-robots-txt/ai.robots.txt, MIT) that
// tests/ai-robots.test.js compares public/robots.txt with (2026-11-24).
//
// The list is ~90 kB of prose; the test needs the agent names and what each
// one is for, so the fixture keeps `name -> function` plus the tag, commit,
// and the sha256 of the robots.json it was cut from.
//
//   node scripts/ai-robots-pin.mjs <tag>    re-pin to a release tag (writes the fixture)
//   node scripts/ai-robots-pin.mjs --report compare the LATEST upstream main with
//                                           robots.txt + the reviewed list; prints
//                                           new names, changes nothing
//
// Re-pinning is how a new upstream name reaches the test: it then fails until
// the name is either given its own group in robots.txt (a policy change — the
// founder's call) or added to REVIEWED_UNNAMED in the test with a dated note.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'ai-robots-txt.json');
const REPO = 'ai-robots-txt/ai.robots.txt';

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'sqlquest-ai-robots-pin' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r;
}

export function namedAgents(robotsTxt) {
  return [...robotsTxt.matchAll(/^User-agent:\s*(.+?)\s*$/gim)].map(m => m[1]).filter(a => a !== '*');
}

async function pin(tag) {
  const ref = await (await getJson(`https://api.github.com/repos/${REPO}/commits/${encodeURIComponent(tag)}`)).json();
  const raw = Buffer.from(await (await getJson(`https://raw.githubusercontent.com/${REPO}/${ref.sha}/robots.json`)).arrayBuffer());
  const list = JSON.parse(raw.toString('utf8'));
  const agents = Object.fromEntries(Object.entries(list).map(([k, v]) => [k, v.function || '']));
  const out = {
    source: `https://github.com/${REPO}`,
    license: 'MIT',
    tag,
    commit: ref.sha,
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    pinned: new Date().toISOString().slice(0, 10),
    agents,
  };
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + '\n');
  console.log(`pinned ${REPO} ${tag} (${ref.sha.slice(0, 7)}): ${Object.keys(agents).length} agents`);
}

async function report() {
  const latest = await (await getJson(`https://raw.githubusercontent.com/${REPO}/main/robots.json`)).json();
  const pinned = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const fresh = Object.keys(latest).filter(k => !(k in pinned.agents));
  const gone = Object.keys(pinned.agents).filter(k => !(k in latest));
  console.log(`upstream main vs pinned ${pinned.tag}: ${fresh.length} new, ${gone.length} removed`);
  for (const k of fresh) console.log(`  + ${k} — ${latest[k].function || ''}`);
  for (const k of gone) console.log(`  - ${k}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node scripts/ai-robots-pin.mjs <tag> | --report'); process.exit(2); }
  (arg === '--report' ? report() : pin(arg)).catch(e => { console.error(e.message); process.exit(1); });
}
