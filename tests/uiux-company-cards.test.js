// Company-page cards (A4 UI/UX audit, 2026-11-22), on ~33 company pages:
// - the question cards' difficulty and topic pills (.db, .tt) were 11 px
//   and the "SQL Quest challenge #N" eyebrow 10 px (U4; DESIGN.md's
//   smallest size is 12);
// - the format card's "Capital One CodeSignal page" link was painted in the
//   company's brand colour — Stripe's #635BFF on near-black is 2.07:1 (U6,
//   21 pages). It now takes the paragraph's own colour, underlined.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const sources = [];
const walk = (d, re) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, re); else if (re.test(e.name)) sources.push(p); } };
walk(path.join(ROOT, 'src'), /\.html$/);
walk(path.join(ROOT, 'scripts'), /\.(mjs|js)$/);
const offenders = (re) => sources.filter(f => re.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(ROOT, f));

describe('company question cards: no text under 12 px', () => {
  it('the scan finds the cards', () => expect(offenders(/\.db\{font-size:/).length).toBeGreaterThan(30));
  it('difficulty and topic pills are 12 px or more', () => {
    expect(offenders(/\.(db|tt)\{font-size:(?:[0-9]|1[01])px/)).toEqual([]);
  });
  it('the challenge-number eyebrow is 12 px or more', () => {
    expect(offenders(/font-size:(?:[0-9]|1[01])px[^"]*">SQL Quest challenge #/)).toEqual([]);
  });
});

describe('format cards: the link is readable on every brand colour', () => {
  it('the Capital One link never takes the company accent', () => {
    expect(offenders(/style="color:\$\{accent\}">Capital One CodeSignal page/)).toEqual([]);
    expect(offenders(/style="color:inherit;text-decoration:underline">Capital One CodeSignal page/).length).toBeGreaterThan(15);
  });
  it('a built page carries it', () => {
    const built = fs.readFileSync(path.join(ROOT, 'public/stripe-sql-interview/index.html'), 'utf8');
    expect(built).toContain('style="color:inherit;text-decoration:underline">Capital One CodeSignal page');
    expect(built).toContain('.db{font-size:12px');
  });
});
