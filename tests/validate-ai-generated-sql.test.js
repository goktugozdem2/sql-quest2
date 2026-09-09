// Publication contract for /blog/validate-ai-generated-sql/.
//
// 2026-09-09, after the body rewrite: the first version taught on an invented
// customers/payments schema and this file built a matching fixture, so the
// test proved the SQL ran — against a database that existed nowhere but here.
// The article now works on the SHIPPED finans_fraud ledger, so the fixture is
// gone and the real dataset is loaded instead.
//
// That upgrade is the point. Every number the prose states — 200 rows from the
// wrong query, 24 from the right one, 1,715 cross-border transactions, 76
// disputes against 59 resolved, 2,165 joined rows against 200 people — is
// asserted below against the data the reader will actually open. If
// scripts/generate-fraud-transactions.js is ever re-run, these fail, and the
// prose must be corrected rather than the numbers loosened. An article whose
// figures drift from its own dataset is worse than one with no figures.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const source = read('src/blog/validate-ai-generated-sql.html');
const built = read('public/blog/validate-ai-generated-sql/index.html');

function decodeSql(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

// Same load path as scripts/validate-fraud-challenges.js: the dataset file
// assigns onto `window`, so it is evaluated in a sandbox rather than imported.
function loadFraudDb() {
  const sandbox = { window: {}, console: { log: () => {} } };
  vm.createContext(sandbox);
  vm.runInContext(read('src/data/finans-fraud-data.js'), sandbox);
  const ds = sandbox.window.publicDatasetsData?.finans_fraud;
  if (!ds?.tables) throw new Error('finans_fraud dataset missing');

  const inferType = (samples) => {
    let isInt = true;
    let isReal = true;
    let allEmpty = true;
    for (const v of samples) {
      if (v === null || v === undefined || v === '') continue;
      allEmpty = false;
      if (typeof v === 'number') { if (!Number.isInteger(v)) isInt = false; continue; }
      const str = String(v);
      if (!/^-?\d+$/.test(str)) isInt = false;
      if (!/^-?\d+(?:\.\d+)?$/.test(str)) isReal = false;
    }
    if (allEmpty) return 'TEXT';
    return isInt ? 'INTEGER' : isReal ? 'REAL' : 'TEXT';
  };

  const db = new Database(':memory:');
  for (const [name, def] of Object.entries(ds.tables)) {
    const types = def.columns.map((_, ci) => inferType(def.data.slice(0, 50).map((r) => r[ci])));
    db.exec(`CREATE TABLE ${name} (${def.columns.map((c, i) => `"${c}" ${types[i]}`).join(', ')})`);
    const insert = db.prepare(`INSERT INTO ${name} VALUES (${def.columns.map(() => '?').join(',')})`);
    db.transaction((rows) => { for (const r of rows) insert.run(r); })(def.data);
  }
  return db;
}

describe('AI-generated SQL validation guide publication contract', () => {
  it('publishes one indexable canonical article with valid author and FAQ schema', () => {
    expect(source.match(/<h1\b/g)).toHaveLength(1);
    expect(source).toContain('<html lang="en">');
    expect(source).toContain('<meta name="robots" content="index, follow">');
    expect(source).toContain('<link rel="canonical" href="https://sqlquest.app/blog/validate-ai-generated-sql/">');
    expect(source).toContain('By Can Goktug Ozdem, Founder of SQL Quest');

    const schemas = [...source.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)]
      .map((match) => JSON.parse(match[1]));
    const article = schemas.find((schema) => schema['@type'] === 'BlogPosting');
    const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');

    expect(article.author).toMatchObject({ '@type': 'Person', name: 'Can Goktug Ozdem' });
    expect(article.publisher).toMatchObject({ '@type': 'Organization', name: 'SQL Quest' });
    expect(faq.mainEntity).toHaveLength(4);
    for (const item of faq.mainEntity) {
      expect(source).toContain(`<summary>${item.name}</summary>`);
      expect(source).toContain(item.acceptedAnswer.text);
    }
  });

  it('is discoverable through the build, sitemap, blog hub, and contextual internal link', () => {
    expect(read('scripts/build-static-pages.js')).toContain("'validate-ai-generated-sql'");
    expect(read('public/sitemap.xml')).toContain('<loc>https://sqlquest.app/blog/validate-ai-generated-sql/</loc>');
    expect(read('src/blog/index.html')).toContain('/blog/validate-ai-generated-sql/');
    expect(read('src/sql-for-the-ai-era.html')).toContain('/blog/validate-ai-generated-sql/');
  });

  it('preserves first-party conversion tracking and the one-way editorial attribution', () => {
    // Every practice exit carries the per-article src, never a generic
    // utm_source=blog, so each article is its own row in door_solve_rate
    // instead of merging into the shared `blog` bucket.
    const exits = [...source.matchAll(/data-track="(cta_practice_validate_ai_sql_[a-z]+)" href="([^"]+)"/g)];
    expect(exits.length).toBeGreaterThanOrEqual(3);
    for (const [, , href] of exits) {
      expect(href).toContain('src=validate-ai-generated-sql');
      expect(href.startsWith('/app/?challenge=')).toBe(true);
    }
    // The deep links must be the lesson the section that links them teaches.
    const linked = exits.map(([, , href]) => Number(href.match(/challenge=(\d+)/)[1]));
    expect(new Set(linked)).toEqual(new Set([290, 287, 291]));
    expect(built.match(/<script defer src="\/track\.js"><\/script>/g)).toHaveLength(1);

    const campaign = 'https://claudequest.app/blog/practice-ai-prompting-with-feedback?ref=sqlquest&amp;utm_source=sqlquest&amp;utm_medium=editorial_link&amp;utm_campaign=validate_ai_generated_sql';
    expect(source).toContain(`data-track="editorial_claudequest_click" href="${campaign}"`);
    expect(source.match(/href="https:\/\/claudequest\.app\//g)).toHaveLength(1);
    expect(source).toContain('SQL Quest and ClaudeQuest are independent Datrick learning products.');
    expect(source).toContain('SQL Quest is not affiliated with, endorsed by, or sponsored by Anthropic.');
  });

  it('runs every worked example on the shipped ledger and returns the numbers the prose states', () => {
    const snippets = [...source.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)]
      .map((match) => decodeSql(match[1]));
    expect(snippets).toHaveLength(4);

    const db = loadFraudDb();
    try {
      // The ledger the article describes to the reader, in the callout.
      expect(db.prepare('SELECT COUNT(*) n FROM accounts').get().n).toBe(200);
      expect(db.prepare('SELECT COUNT(*) n FROM transactions').get().n).toBe(2165);
      expect(db.prepare('SELECT COUNT(*) n FROM merchants').get().n).toBe(25);
      expect(db.prepare('SELECT COUNT(*) n FROM chargebacks').get().n).toBe(76);

      // 1. The plausible query. Its whole point is that it flags EVERY
      //    cardholder, which is why row count cannot be read as confidence.
      expect(db.prepare(snippets[0]).all()).toHaveLength(200);

      // 2. The same question asked of the group. 8x smaller, and correct.
      expect(db.prepare(snippets[1]).all()).toHaveLength(24);

      // 3. COUNT(*) against COUNT(column) on a nullable column.
      expect(db.prepare(snippets[2]).get()).toEqual({ all_disputes: 76, resolved_disputes: 59 });

      // 4. Fan-out: rows are not people.
      expect(db.prepare(snippets[3]).get()).toEqual({ joined_rows: 2165, people: 200 });

      // The cross-border figure quoted in the prose as the reason the wrong
      // query survives review.
      const crossBorder = db.prepare(`
        SELECT COUNT(*) n FROM transactions t
        JOIN merchants m ON m.merchant_id = t.merchant_id
        JOIN accounts a ON a.account_id = t.account_id
        WHERE m.country <> a.country`).get().n;
      expect(crossBorder).toBe(1715);
      expect(source).toContain('1,715 of 2,165 transactions cross a border');
    } finally {
      db.close();
    }
  });
});
