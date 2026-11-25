// The vendored fonts ship with their licence (orchestrator 2026-11-25).
// SIL OFL 1.1 §2 lets the fonts be redistributed only with the copyright
// notice and the licence; api/og-card.js bundles assets/fonts/Geist-*.ttf.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../assets/fonts/', import.meta.url));

describe('vendored fonts carry their licence', () => {
  const fonts = readdirSync(DIR).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f));

  it('there are vendored fonts to cover', () => {
    expect(fonts.length).toBeGreaterThan(0);
  });

  it('OFL.txt sits next to them with the Geist notice and the full OFL 1.1', () => {
    const p = join(DIR, 'OFL.txt');
    expect(existsSync(p), 'assets/fonts/OFL.txt is missing').toBe(true);
    const text = readFileSync(p, 'utf8');
    expect(text).toMatch(/Copyright \(c\) 2023 Vercel, in collaboration with basement\.studio/);
    expect(text).toMatch(/SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/);
    expect(text).toMatch(/TERMINATION/);
  });

  it('every vendored font is a Geist cut (a new family needs its own licence)', () => {
    for (const f of fonts) expect(f, f).toMatch(/^Geist-/);
  });
});
