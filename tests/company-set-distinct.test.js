// A company's practice set must be its own (2026-11-22, agent C1).
//
// The fear: a new company page whose set is another company's set with the
// name swapped — a doorway. tests/company-pages.test.js already fails an EMPTY
// set; nothing failed a copied one. From the Chime page on, a set added
// through NEW_COMPANY_TAG_REASONS must:
//   1. give one line of reasoning for every id it tags, and tag every id it
//      reasons about (the two cannot drift apart);
//   2. stay under Jaccard 0.5 against every other company's live set.
// Older sets are not held to 2: Anthropic/OpenAI and Netflix/Spotify sit at
// 0.64 and predate this rule.
import { describe, it, expect } from 'vitest';
import { NEW_COMPANY_TAGS, NEW_COMPANY_TAG_REASONS } from '../src/data/company-interviews.js';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';

const MAX_JACCARD = 0.5;

export function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  return inter / (A.size + B.size - inter);
}

const { bank, tags } = loadQuestionBank();
const liveSets = {};
for (const [id, names] of Object.entries(tags)) for (const n of names) (liveSets[n] ||= new Set()).add(Number(id));
const bankIds = new Set(bank.map(c => c.id));

describe('company sets with reasons (from 2026-11-22)', () => {
  const names = Object.keys(NEW_COMPANY_TAG_REASONS);

  it('covers at least the Chime set', () => {
    expect(names).toContain('Chime');
  });

  for (const name of names) {
    it(`${name}: one reason per tagged id, no reason without a tag`, () => {
      const ids = NEW_COMPANY_TAGS[name];
      expect(ids, `${name} has reasons but no NEW_COMPANY_TAGS entry`).toBeTruthy();
      const reasoned = Object.keys(NEW_COMPANY_TAG_REASONS[name]).map(Number).sort((a, b) => a - b);
      expect(reasoned).toEqual([...ids].sort((a, b) => a - b));
      for (const id of ids) {
        expect(bankIds.has(id), `${name}: ${id} is not in the bank`).toBe(true);
        expect(String(NEW_COMPANY_TAG_REASONS[name][id]).trim().length, `${name}: ${id} reason`).toBeGreaterThan(15);
      }
      expect(new Set(ids).size, `${name}: duplicate ids`).toBe(ids.length);
    });

    it(`${name}: not a copy of another company's set (Jaccard < ${MAX_JACCARD})`, () => {
      const mine = NEW_COMPANY_TAGS[name];
      const copies = Object.entries(liveSets)
        .filter(([other]) => other !== name)
        .map(([other, set]) => ({ other, j: jaccard(mine, [...set]) }))
        .filter(x => x.j >= MAX_JACCARD);
      expect(copies, `${name} overlaps too much with: ${copies.map(c => `${c.other} ${c.j.toFixed(2)}`).join(', ')}`).toEqual([]);
    });
  }
});
