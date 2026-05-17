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
  'practice-sql-no-setup',
  'sql-interview-prep',
  'learn-sql',
  'sql-tutorial',
  'sql-cheat-sheet',
  'sql-exercises',
  'learn-sql-for-beginners',
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
  'sql-joins-explained',
  'window-functions-tutorial',
  'null-handling-mistakes',
  'sql-cte-tutorial',
  'sql-for-fraud-analytics',
  'sql-group-by-tutorial',
  'sql-case-when-tutorial',
];

function copyFile(srcRelative, destRelative) {
  const src = path.join(rootDir, srcRelative);
  const dest = path.join(rootDir, destRelative);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing static source page: ${srcRelative}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
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

console.log(`[build-static-pages] copied ${rootPages.length} root pages and ${blogPosts.length} blog posts`);
