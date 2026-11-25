// The sourced format table scrolls inside itself on a 320 px phone (A4 UI/UX
// audit, issue #308, 2026-11-24, U1/U2 on the Galaxy S9+ row).
//
// withSourcedFormat (scripts/build-company-pages.mjs) injects
// "How the interview runs (sourced)" into hand-written company pages as
// well as generated ones. Its table sat in `<div class="tbl">`, but the
// `.tbl{overflow-x:auto}` rule lives only in the generated template and on
// /amazon-sql-interview/. On /shopify-sql-interview/ and
// /meta-sql-interview/ nothing styled the wrapper, so the nowrap row headers
// pushed the page 61 px past 320 and 6 px past 375 (the only critical at
// 375 in the run), and the cite links landed off screen (`#format a`).
// The wrapper now carries its own overflow, so the block is correct on
// any page it is injected into.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withSourcedFormat } from '../scripts/build-company-pages.mjs';
import { SOURCED_FORMATS } from '../src/data/company-interviews.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCROLLS = /<div class="tbl" style="[^"]*overflow-x:auto[^"]*"><table>/;

describe('the sourced format table scrolls inside its own wrapper', () => {
  it('there are sourced formats to inject', () => expect(Object.keys(SOURCED_FORMATS)).toEqual(expect.arrayContaining(['meta', 'shopify'])));

  it('the block carries its overflow, whatever CSS the page has', () => {
    for (const slug of Object.keys(SOURCED_FORMATS)) {
      const out = withSourcedFormat('<html><style></style><section id="topics"></section></html>', slug);
      expect(out, slug).toContain('data-section="format-sourced"');
      expect(out, slug).toMatch(SCROLLS);
    }
  });

  it('every committed page with the block has it (hand-written ones included)', () => {
    const pages = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('-sql-interview.html'));
    const withBlock = pages.filter(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').includes('data-section="format-sourced"'));
    expect(withBlock).toContain('shopify-sql-interview.html');
    expect(withBlock).toContain('meta-sql-interview.html');
    for (const f of withBlock) {
      expect(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), `${f}: run node scripts/build-company-pages.mjs`).toMatch(SCROLLS);
    }
  });
});
