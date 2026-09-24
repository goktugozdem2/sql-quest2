// The AI tutor has a daily cap on every plan (supabase/functions/ai-tutor,
// DAILY_LIMITS: guest 5, free 20, monthly 50, annual 75, lifetime 100).
// Until 2026-09-24 the app said "go unlimited", the trial email promised
// "Unlimited AI tutor (Free is capped at 10/day)" — both false: Pro has a cap
// and Free's is 20. A money claim we cannot honour is a refund waiting.
// docs/plans/monetization-2026-09-24.md, item 4.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const tutor = read('supabase/functions/ai-tutor/index.ts');
const freeLimit = Number(tutor.match(/free:\s*(\d+)/)[1]);

const SURFACES = [
  'src/app.jsx',
  'src/utils/i18n.js',
  'supabase/functions/trial-reminder-cron/index.ts',
];

// Strip comments so a code note ("no timer, unlimited hints") is not a claim.
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('AI tutor limit claims', () => {
  it('Pro is never called unlimited next to the tutor or the AI limit', () => {
    for (const p of SURFACES) {
      const body = stripComments(read(p));
      expect(body, p).not.toMatch(/unlimited\s+(ai\s+)?tutor/i);
      expect(body, p).not.toMatch(/go unlimited/i);
      expect(body, p).not.toMatch(/removes the daily (ai )?(cap|limit)/i);
      expect(body, p).not.toMatch(/unlimited access to all interviews|sınırsız erişim/i);
    }
  });

  it('a stated free daily number matches the server', () => {
    for (const p of SURFACES) {
      const body = stripComments(read(p));
      for (const m of body.matchAll(/(?:all|capped at|Free:)\s*(\d+)\s*(?:free AI tutor|\/day| a day)/gi)) {
        expect(Number(m[1]), `${p}: "${m[0]}"`).toBe(freeLimit);
      }
    }
  });
});
