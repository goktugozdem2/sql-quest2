// /sql-exercises/ #by-difficulty — the tier table and the three tier cards,
// bound to the live bank (2026-11-22).
//
// site-counts.test.js only reads numbers of 100 and up as bank claims, so
// every cell here (60 core Easy, 25 sector Hard …) sat outside it. A1's review
// of #132 found the page still saying "195 core", "Core 83", "unlocks the other
// 76" and "6 previews" after the bank had moved on twice. This test reads the
// table and the cards out of the source page and compares them with the bank
// split computed by the same loader llms.txt uses.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBank } from '../scripts/build-llms-txt.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'src/sql-exercises.html'), 'utf8');

export function bankSplit(bank = loadBank()) {
  const sector = new Set(bank.sectorChallengesData.map(c => c.id));
  const split = {};
  for (const d of ['Easy', 'Medium', 'Hard']) {
    const all = bank.challengesData.filter(c => c.difficulty === d);
    split[d] = { core: all.filter(c => !sector.has(c.id)).length, sector: all.filter(c => sector.has(c.id)).length, all: all.length };
  }
  split.core = split.Easy.core + split.Medium.core + split.Hard.core;
  split.sector = split.Easy.sector + split.Medium.sector + split.Hard.sector;
  return split;
}

// Every <tr> of the by-difficulty table as an array of cell texts.
export function tableRows(html) {
  const table = /<table class="data-table">([\s\S]*?)<\/table>/.exec(html);
  if (!table) return [];
  return [...table[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<t[dh]>([\s\S]*?)<\/t[dh]>/g)].map(c => c[1].trim()));
}

// Each tier card: title, description and its tags.
export function tierCards(html) {
  return [...html.matchAll(/<p class="slice-title">(Easy|Intermediate \(Medium\)|Hard) — ([^<]*)<\/p>\s*<p class="slice-desc">([^<]*)<\/p>\s*<div class="slice-tags">([\s\S]*?)<\/div>/g)]
    .map(m => ({
      tier: m[1].includes('Medium') ? 'Medium' : m[1],
      title: m[2],
      desc: m[3],
      tags: [...m[4].matchAll(/<span class="slice-tag">([^<]*)<\/span>/g)].map(t => t[1]),
    }));
}

const split = bankSplit();

describe('/sql-exercises/ by difficulty — bound to the bank', () => {
  it('the table states the live core / sector / all split', () => {
    const rows = tableRows(PAGE);
    const row = label => rows.find(r => r[0].startsWith(label));
    expect(row('Core exercises')).toEqual(['Core exercises', `${split.Easy.core}`, `${split.Medium.core}`, `${split.Hard.core}`, `${split.core}`]);
    expect(row('Sector tracks').slice(1)).toEqual([`${split.Easy.sector}`, `${split.Medium.sector}`, `${split.Hard.sector}`, `${split.sector}`]);
    // The total is said rounded (bankCountLabel); the per-difficulty cells exact.
    expect(row('All exercises').slice(1, 4)).toEqual([`${split.Easy.all}`, `${split.Medium.all}`, `${split.Hard.all}`]);
  });

  it('each tier card states its live total and core / sector tags', () => {
    const cards = tierCards(PAGE);
    expect(cards.map(c => c.tier)).toEqual(['Easy', 'Medium', 'Hard']);
    for (const c of cards) {
      expect(c.title, `${c.tier} card title`).toMatch(new RegExp(`^${split[c.tier].all} exercises`));
      expect(c.tags, `${c.tier} card tags`).toContain(`Core ${split[c.tier].core}`);
      expect(c.tags, `${c.tier} card tags`).toContain(`Sector ${split[c.tier].sector}`);
    }
  });

  it('no card counts Hard previews or "the other N" (a count the gates do not say)', () => {
    for (const c of tierCards(PAGE)) {
      const text = [c.title, c.desc, ...c.tags].join(' ');
      expect(text, c.tier).not.toMatch(/\b\d+\s+(?:Hard\s+)?previews?\b/i);
      expect(text, c.tier).not.toMatch(/\bthe other \d+\b/i);
    }
  });

  it('the intro paragraph states the live core count', () => {
    expect(PAGE).toContain(`counted from the live bank: ${split.core} core problems plus ${split.sector}`);
  });
});
