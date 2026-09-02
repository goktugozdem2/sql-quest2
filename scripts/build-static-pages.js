import fs from 'fs';
import path from 'path';

const __dirname = import.meta.dirname;
const rootDir = path.resolve(__dirname, '..');

const rootPages = [
  'index',
  'app',
  'meta-sql-interview',
  'google-sql-interview',
  'amazon-sql-interview',
  'netflix-sql-interview',
  'stripe-sql-interview',
  'apple-sql-interview',
  'uber-sql-interview',
  'airbnb-sql-interview',
  'databricks-sql-interview',
  'shopify-sql-interview',
  'spotify-sql-interview',
  'jpmorgan-sql-interview',
  'snowflake-sql-interview',
  'plaid-sql-interview',
  'ramp-sql-interview',
  'revolut-sql-interview',
  'wise-sql-interview',
  'nvidia-sql-interview',
  'openai-sql-interview',
  'anthropic-sql-interview',
  'tesla-sql-interview',
  'morgan-stanley-sql-interview',
  'practice-sql-no-setup',
  'sql-interview-prep',
  'learn-sql',
  'sql-tutorial',
  'sql-cheat-sheet',
  'sql-exercises',
  'learn-sql-for-beginners',
  'sql-find-duplicates',
  'sql-cte-vs-subquery',
  'sql-interview-questions-data-analyst',
  'vs-datalemur',
  'datalemur-karsilastirma',
  'vs-stratascratch',
  'vs-leetcode-sql',
  'vs-hackerrank-sql',
  'sql-practice-comparison',
  'best-sql-practice-sites',
  'sql-quiz',
  'fraud-analytics-sql',
  'after-the-sql-course',
  'after-bootcamp',
  'sql-for-the-ai-era',
];

const blogPosts = [
  // Recovered 2026-08-04. This post was live and earning (157 impressions,
  // 5 clicks in GSC) but existed only as a built file under public/ with no
  // source here — so it had no analytics, no quiz, and no way to be rebuilt.
  // It predates the src/ layout; commit 409cf43 replaced the repo around it.
  'faang-sql-interview-guide',
  'row-number-vs-rank-vs-dense-rank',
  'where-vs-having',
  'is-null-vs-equals-null',
  'sql-running-total',
  'sql-anti-join',
  'sql-join-nedir',
  'sql-cte-nedir',
  'left-join-vs-inner-join',
  'what-is-a-cte-in-sql',
  'recursive-cte-explained',
  'sql-joins-explained',
  'window-functions-tutorial',
  'null-handling-mistakes',
  'sql-cte-tutorial',
  'sql-for-fraud-analytics',
  'sql-group-by-tutorial',
  'sql-case-when-tutorial',
  'sql-for-ai-company-interviews',
  'time-series-sql-hardware-interviews',
];

// First-party landing analytics. Injected here rather than pasted into each
// page so coverage cannot drift: the next landing page gets it for free.
//
// Anchored to the Vercel insights script, which every page except app.html
// already carries — app.html is excluded on purpose, since the app has richer
// instrumentation of its own and would only burn the shared 50k/month Hobby
// event cap. See src/track.js for why we write our own events at all.
const VERCEL_INSIGHTS = '<script defer src="/_vercel/insights/script.js"></script>';
const TRACK_TAG = '<script defer src="/track.js"></script>';

let injected = 0;
let skipped = [];

// app.html is the ONLY deliberate exclusion. It has richer first-party
// instrumentation already, and adding a second pageview source would only
// burn the shared Hobby event cap.
const NO_TRACKING = new Set(['src/app.html']);

function withTracking(html, srcRelative) {
  // The presence check must match the TAG, not the substring. src/index.html,
  // the two variant landing pages and sql-for-the-ai-era mention "/track.js"
  // inside a comment, which made the old `includes('/track.js')` skip them —
  // so the homepage, the very door the AI-recommended traffic lands on, never
  // wrote a landing_view or a CTA click. Found 2026-09-03; `landing_view`
  // for page=home is born that day (see docs/agent/metrics.md).
  if (html.includes('src="/track.js"')) return html;     // already present
  if (NO_TRACKING.has(srcRelative)) { skipped.push(srcRelative); return html; }

  if (html.includes(VERCEL_INSIGHTS)) {
    injected++;
    return html.replace(VERCEL_INSIGHTS, VERCEL_INSIGHTS + '\n  ' + TRACK_TAG);
  }
  // The 10 blog posts carry no Vercel insights tag, so they were invisible on
  // BOTH sides — no pageviews anywhere, despite being SEO landing pages in
  // every practical sense. Anchor on </body> instead of skipping them.
  if (html.includes('</body>')) {
    injected++;
    return html.replace('</body>', '  ' + TRACK_TAG + '\n</body>');
  }
  skipped.push(srcRelative);
  return html;
}

function copyFile(srcRelative, destRelative) {
  const src = path.join(rootDir, srcRelative);
  const dest = path.join(rootDir, destRelative);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing static source page: ${srcRelative}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (srcRelative.endsWith('.html')) {
    fs.writeFileSync(dest, withTracking(fs.readFileSync(src, 'utf8'), srcRelative));
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyRootPage(slug) {
  const fileName = `${slug}.html`;
  copyFile(`src/${fileName}`, `public/${fileName}`);

  if (slug !== 'index') {
    copyFile(`src/${fileName}`, `public/${slug}/index.html`);
  }
}

for (const slug of rootPages) {
  copyRootPage(slug);
}

copyFile('src/blog/index.html', 'public/blog/index.html');

for (const slug of blogPosts) {
  copyFile(`src/blog/${slug}.html`, `public/blog/${slug}/index.html`);
}

copyFile('src/track.js', 'public/track.js');
copyFile('src/blog-quiz.js', 'public/blog-quiz.js');

console.log(`[build-static-pages] copied ${rootPages.length} root pages and ${blogPosts.length} blog posts`);
console.log(`[build-static-pages] tracking injected into ${injected} page copies` +
  (skipped.length ? `; no insights tag on ${[...new Set(skipped)].join(', ')}` : ''));
