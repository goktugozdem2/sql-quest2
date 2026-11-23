// No exclusivity claims about the AI coach, tutor, diagnostic or Skillmap
// (2026-11-23). /best-sql-practice-sites/ said SQL Quest was "the only
// platform reviewed with a wrong-answer diagnostic, an AI Coach and an
// adaptive 9-skill Skillmap" and that "no other platform has" the diagnostic.
// B6's dated competitor read (docs/reads/competitors-2026-11-22.md, row 4)
// found AI tutors, AI interviewers and AI feedback elsewhere, so the claim
// was false, and it sat in FAQ JSON-LD that AI assistants quote.
//
// The rule: say what SQL Quest does (the Skillmap across nine skills, the
// Coach picking the next step from it, the tutor reading your actual query),
// never what competitors lack. A sentence that names one of those features
// and carries an exclusivity phrase fails here, in the body, meta or JSON-LD
// of any page under src/, and in the string content of any page generator.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const walk = (dir, keep) => fs.readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(`${dir}/${e.name}`, keep) : keep(e.name) ? [`${dir}/${e.name}`] : []);
const pages = walk('src', n => n.endsWith('.html')).filter(f => f !== 'src/app.html');
const generators = fs.readdirSync(join(ROOT, 'scripts'))
  .filter(n => /^build-.*\.(?:mjs|js)$/.test(n)).map(n => `scripts/${n}`);
const read = f => fs.readFileSync(join(ROOT, f), 'utf8');
const stripHtmlComments = s => s.replace(/<!--[\s\S]*?-->/g, ' ');
const stripJsComments = s => s.replace(/^\s*\/\/.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');

export const EXCLUSIVE = [
  /\bthe only (?:platform|site|tool|product|app|practice|sql|one that)\b/i,
  /\bonly (?:platform|site|tool|product) (?:reviewed |here |that |with )/i,
  /\bno other (?:platform|site|tool|product|app|sql|practice)\b/i,
  /\bnobody else\b/i,
  /\bno one else\b/i,
  /\bno competitors? (?:has|have|offers?)\b/i,
  /\bunlike (?:any|every) other\b/i,
  /\buniquely\b/i,
  /\bunique (?:to|among|in the market)\b/i,
  /\b(?:question banks|competitors|other (?:sites|platforms|tools)) (?:don't|do not|can't|cannot|lack)\b/i,
];
export const FEATURE = /\b(?:AI|Coach|tutor|Skillmap|skill radar|diagnos\w*|adaptive|personali[sz]\w*)\b/i;

// Sentences, roughly: split on sentence ends and on markup/JSON boundaries.
export function exclusivityClaims(text) {
  return text
    .replace(/<[^>]+>/g, '\n')
    .split(/(?<=[.!?])\s+|\n|","|\["|"\]/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => FEATURE.test(s) && EXCLUSIVE.some(re => re.test(s)));
}

describe('exclusivityClaims', () => {
  it('catches the sentences the page used to carry', () => {
    expect(exclusivityClaims('SQL Quest — it is the only platform reviewed with a wrong-answer diagnostic, an AI Coach and a Skillmap.')).toHaveLength(1);
    expect(exclusivityClaims('The diagnostic loop changes outcomes most, and no other platform has it.')).toHaveLength(1);
    expect(exclusivityClaims('<h2>The tutor features the question banks don\'t have</h2>')).toHaveLength(1);
  });
  it('leaves SQL and plain product statements alone', () => {
    expect(exclusivityClaims('ROW_NUMBER is the only one of the three guaranteed to produce one row.')).toEqual([]);
    expect(exclusivityClaims('Type "why do I get unique ranks?" in the AI Coach panel.')).toEqual([]);
    expect(exclusivityClaims('The Coach picks your next step from your weakest Skillmap skill.')).toEqual([]);
    expect(exclusivityClaims('Why no competitor fact on this page is from memory.')).toEqual([]);
  });
});

describe('no exclusivity claims about the AI coach, tutor or Skillmap', () => {
  it('in any page under src/ — body, meta or JSON-LD', () => {
    const bad = pages.flatMap(f => exclusivityClaims(stripHtmlComments(read(f))).map(s => `${f}: ${s}`));
    expect(bad).toEqual([]);
  });
  it('in any page generator under scripts/', () => {
    const bad = generators.flatMap(f => exclusivityClaims(stripJsComments(read(f))).map(s => `${f}: ${s}`));
    expect(bad).toEqual([]);
  });
});
