// The marketing nav on a phone and its button colour (A4 UI/UX audit,
// 2026-11-22).
// - `.nl a{color:#94a3b8}` (0,1,1) outranked `.bp{color:…}` (0,1,0): the
//   nav's "Start Free →" / "Check readiness" painted slate grey on its own
//   purple or yellow button (2.00:1 on the yellow). The grey now applies
//   to text links only, so each button keeps its own colour.
// - Nav links and buttons were 32–38 px tall on a phone, `.btn.bo` 42 px
//   everywhere (U3). scripts/phone-fit.mjs adds one rule to every page.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withPhoneFit, PHONE_FIT_STYLE } from '../scripts/phone-fit.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const sources = [];
const walk = (d, re) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, re); else if (re.test(e.name)) sources.push(p); } };
walk(path.join(ROOT, 'src'), /\.html$/);
walk(path.join(ROOT, 'scripts'), /\.(mjs|js)$/);

describe('the nav button keeps its own colour', () => {
  it('no source styles every `.nl a` (buttons included) with a colour', () => {
    const bad = sources.filter(f => /\.nl a(:hover)?\{[^}]*color:/.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(ROOT, f));
    expect(bad).toEqual([]);
  });
  it('the scoped rule is there (the scan found the navs)', () => {
    const scoped = sources.filter(f => fs.readFileSync(f, 'utf8').includes('.nl a:not(.btn):not(.bp){'));
    expect(scoped.length).toBeGreaterThan(40);
  });
});

describe('phone-fit: 44 px nav targets on every built page', () => {
  it('sets sizes only — no colour, no display', () => {
    expect(PHONE_FIT_STYLE).toMatch(/\.btn\.bo\{min-height:44px\}/);
    expect(PHONE_FIT_STYLE).toMatch(/@media\(max-width:600px\)\{\.ni a,\.ni \.bp,\.nl \.btn\{min-height:44px\}\}/);
    expect(PHONE_FIT_STYLE).not.toMatch(/color|display/);
  });
  it('goes in once, before </head>, and replaces an older copy', () => {
    const page = '<html><head><title>x</title></head><body></body></html>';
    const once = withPhoneFit(page);
    expect(once).toContain(PHONE_FIT_STYLE + '</head>');
    expect(withPhoneFit(once)).toBe(once);
    expect(withPhoneFit(page.replace('</head>', '<style data-phone-fit>old</style></head>'))).toBe(once);
  });
  it('runs in the build after the footer step, and in build:weekly', () => {
    const { build, 'build:weekly': weekly } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts;
    expect(build.indexOf('phone-fit')).toBeGreaterThan(build.indexOf('footer-partner-link'));
    expect(weekly).toContain('phone-fit.mjs --weekly');
  });
  it('a built company page carries it, the app does not', () => {
    expect(fs.readFileSync(path.join(ROOT, 'public/wise-sql-interview/index.html'), 'utf8')).toContain(PHONE_FIT_STYLE);
    expect(fs.readFileSync(path.join(ROOT, 'public/app.html'), 'utf8')).not.toContain('data-phone-fit');
  });
});
