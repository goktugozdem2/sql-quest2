// /sql-exercises/ tables scroll inside themselves on a 320 px phone (A4 UI/UX
// audit, issue #308, run 2026-11-25 16:25, U1 on the Galaxy S9+ row).
//
// The worked sample ("Top 3 Highest-Paid Employees per Department") shows
// its data and expected output as .data-table tables in a card whose
// content box is 214 px at 320. The four mono columns (id, name,
// department, salary) need 282 px; with no scroller around them the
// document ran 15 px sideways. The page's bank table already sat in an
// overflow-x:auto box; the two sample tables now do too (.tbl-scroll).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

// Every <table> must have an ancestor <div> whose class is tbl-scroll or
// whose inline style sets overflow-x:auto, opened before the table and not
// yet closed. A small div-depth walk is enough for this hand-written page.
function unwrappedTables(html) {
  const out = [];
  const stack = [];
  const re = /<div\b([^>]*)>|<\/div>|<table\b[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<div')) {
      const attrs = m[1] || '';
      stack.push(/class="[^"]*\btbl-scroll\b/.test(attrs) || /style="[^"]*overflow-x:\s*auto/.test(attrs));
    } else if (m[0] === '</div>') stack.pop();
    else if (!stack.some(Boolean)) out.push(html.slice(m.index, m.index + 160).replace(/\s+/g, ' '));
  }
  return out;
}

describe('/sql-exercises/ tables fit a 320 px phone', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/sql-exercises.html'), 'utf8');
  const built = fs.readFileSync(path.join(ROOT, 'public/sql-exercises/index.html'), 'utf8');

  it('the page has its three tables (bank, sample data, expected output)', () => {
    expect((src.match(/<table\b/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('.tbl-scroll scrolls sideways', () => {
    expect(src.replace(/\s+/g, '')).toContain('.tbl-scroll{overflow-x:auto}');
  });

  it('no table sits outside a sideways scroller (source)', () => {
    expect(unwrappedTables(src)).toEqual([]);
  });

  it('no table sits outside a sideways scroller (built page)', () => {
    expect(unwrappedTables(built)).toEqual([]);
  });
});
