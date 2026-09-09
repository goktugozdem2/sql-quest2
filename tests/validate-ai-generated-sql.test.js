import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    expect(read('public/sitemap.xml')).toContain('<lastmod>2026-09-09</lastmod>');
    expect(read('src/blog/index.html')).toContain('/blog/validate-ai-generated-sql/');
    expect(read('src/sql-for-the-ai-era.html')).toContain('/blog/validate-ai-generated-sql/');
  });

  it('preserves first-party conversion tracking and the one-way editorial attribution', () => {
    const practiceHref = '/app/?challenge=103&amp;src=validate-ai-generated-sql';
    expect(source).toContain(`data-track="cta_practice_validate_ai_sql_mid" href="${practiceHref}"`);
    expect(source).toContain(`data-track="cta_practice_validate_ai_sql_end" href="${practiceHref}"`);
    expect(built.match(/<script defer src="\/track\.js"><\/script>/g)).toHaveLength(1);

    const campaign = 'https://claudequest.app/blog/practice-ai-prompting-with-feedback?ref=sqlquest&amp;utm_source=sqlquest&amp;utm_medium=editorial_link&amp;utm_campaign=validate_ai_generated_sql';
    expect(source).toContain(`data-track="editorial_claudequest_click" href="${campaign}"`);
    expect(source.match(/href="https:\/\/claudequest\.app\//g)).toHaveLength(1);
    expect(source).toContain('SQL Quest and ClaudeQuest are independent Datrick learning products.');
    expect(source).toContain('SQL Quest is not affiliated with, endorsed by, or sponsored by Anthropic.');
  });

  it('keeps every worked SQL example executable and aligned with its stated result', () => {
    const snippets = [...source.matchAll(/<pre><code>([\s\S]*?)<\/code><\/pre>/g)]
      .map((match) => decodeSql(match[1]));
    expect(snippets).toHaveLength(3);

    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, email TEXT NOT NULL);
      CREATE TABLE payments (
        payment_id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        status TEXT,
        paid_at TEXT NOT NULL
      );
      INSERT INTO customers VALUES (1, 'a@example.com'), (2, 'b@example.com'), (3, 'c@example.com');
      INSERT INTO payments VALUES
        (1, 1, 'paid', '2026-08-11'),
        (2, 1, 'paid', '2026-08-20'),
        (3, 2, 'pending', '2026-08-12'),
        (4, 3, NULL, '2026-08-15');
    `);

    expect(db.prepare(snippets[0]).all()).toHaveLength(3);
    expect(db.prepare(snippets[1]).all()).toEqual([
      { customer_id: 1, email: 'a@example.com', latest_paid_at: '2026-08-20' },
    ]);
    expect(db.prepare(snippets[2]).get()).toEqual({ joined_rows: 2, distinct_customers: 1 });
    db.close();
  });
});
