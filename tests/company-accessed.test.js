// The "Accessed" date under a template page's sources is the day they were
// fetched (2026-11-22). Until then the generator hard-coded 13 Sep 2026, so the
// PayPal, Coinbase and Monzo pages (fetched 20 Nov) showed a date before their
// sources were even published. An entry that names `accessed` must show it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COMPANY_INTERVIEWS, SOURCED_FORMATS } from '../src/data/company-interviews.js';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('template pages show the day their sources were fetched', () => {
  const dated = Object.entries(COMPANY_INTERVIEWS).filter(([, d]) => d.accessed);
  it('covers the 2026-11 pages', () => {
    expect(dated.map(([k]) => k)).toEqual(expect.arrayContaining(['paypal', 'coinbase', 'monzo', 'chime']));
  });
  // 2026-11-23: the older pages' injected format sections (SOURCED_FORMATS)
  // read `accessed` too; withSourcedFormat had hard-coded 14 Sep 2026, which
  // would have dated Shopify's November sources two months before the read.
  const older = Object.entries(SOURCED_FORMATS).filter(([, d]) => d.accessed);
  it('covers the 2026-11 sourced-format pages', () => {
    expect(older.map(([k]) => k)).toEqual(expect.arrayContaining(['meta', 'shopify']));
  });
  for (const [key, d] of [...dated, ...older]) {
    it(`${key}: "Accessed ${d.accessed}."`, () => {
      const html = fs.readFileSync(path.join(ROOT, 'src', `${key}-sql-interview.html`), 'utf8');
      const shown = [...html.matchAll(/Accessed ([0-9]{1,2} [A-Z][a-z]{2} 20\d\d)\./g)].map(m => m[1]);
      expect(shown).toEqual([d.accessed]);
    });
  }
});
