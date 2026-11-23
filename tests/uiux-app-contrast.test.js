// Muted text in the app passes WCAG AA (A4 UI/UX audit, 2026-11-22).
// Stock Tailwind text-gray-500 (#6B7280) measured 3.5–4.1:1 and
// text-gray-600 (#4B5563) 2.2–2.6:1 on the app's dark surfaces — 1,044
// contrast findings over 13 app screens. tailwind.config.js maps both TEXT
// shades to DESIGN.md's --text-muted, #8A8E99 (5.9:1 on #0E0F13), the way
// it already maps yellow-400 to the accent.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// tailwind.config.js is CommonJS in an ESM package (the Tailwind CLI loads
// it itself), so read it the way the CLI does: run it with a `module`.
const config = (() => { const m = { exports: {} }; new Function('module', 'exports', fs.readFileSync(path.join(ROOT, 'tailwind.config.js'), 'utf8'))(m, m.exports); return m.exports; })();
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('muted app text', () => {
  const tc = config.theme.extend.textColor?.gray || {};
  it('text-gray-500 and text-gray-600 are --text-muted, ≥ 4.5:1 on the app background and surface', () => {
    for (const shade of [500, 600]) {
      expect(tc[shade], `text-gray-${shade}`).toBe('#8A8E99');
      for (const bg of ['#0E0F13', '#16181F']) expect(contrast(tc[shade], bg)).toBeGreaterThan(4.5);
    }
  });
  it('text only — backgrounds and borders keep Tailwind\'s shades', () => {
    expect(config.theme.extend.colors.gray).toBeUndefined();
    const css = fs.readFileSync(path.join(ROOT, 'public/styles.css'), 'utf8');
    expect(css).toMatch(/\.text-gray-500,\.text-gray-600\{[^}]*color:rgb\(138 142 153/);
    expect(css).toMatch(/\.bg-gray-600\{[^}]*rgb\(75 85 99/);
  });
});
