// Marketing pages that scrolled sideways on a phone (A4 UI/UX audit,
// 2026-11-22, U1/U2 — the only critical findings outside the app).
// - Blog posts: a data table wider than the screen widened the page, and
//   the fixed nav's "Practice Free →" went with it (fraud analytics +37 px,
//   Capital One CodeSignal +76 px at 375).
// - /amazon-sql-interview/: the format table's `.tbl` wrapper had no CSS,
//   and the nav CTA ran 14 px past 375.
// - /sql-quiz/: the nav kept its text links on a phone; "Start Free →" sat
//   at x 324–401.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = new URL('../src/', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, SRC), 'utf8');
const css = (html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\s+/g, '');

describe('a blog post table scrolls inside itself on a phone', () => {
  const posts = fs.readdirSync(new URL('blog/', SRC)).filter(f => f.endsWith('.html'));
  const withTables = posts.filter(f => read(path.join('blog', f)).includes('<table'));
  it('there are posts with tables to check', () => expect(withTables.length).toBeGreaterThan(5));
  for (const f of withTables) {
    it(f, () => {
      expect(css(read(path.join('blog', f)))).toMatch(/@media\(max-width:(6\d\d|5\d\d|4\d\d)px\)\{table\{display:block;overflow-x:auto/);
    });
  }
});

describe('/amazon-sql-interview/ fits 375 px', () => {
  const c = css(read('amazon-sql-interview.html'));
  it('the format table scrolls inside .tbl', () => expect(c).toContain('.tbl{overflow-x:auto'));
  it('the nav CTA tightens on a phone', () => expect(c).toMatch(/@media\(max-width:480px\)\{\.ni\{padding:12px16px\}\.nl\.btn\.bp\{padding:10px16px!important\}\}/));
});

describe('/sql-quiz/ drops the nav text links on a phone', () => {
  it('keeps the CTA, hides the rest', () => {
    expect(css(read('sql-quiz.html'))).toMatch(/@media\(max-width:600px\)\{\.nla:not\(\.btn\)\{display:none\}/);
  });
});
