// The free-tier flags as the guards see them (2026-09-26).
//
// The public copy about what is free has to match what the app does, and what
// the app does is decided by two flags in src/data/feature-flags.js:
// `freeQuota` (FREE_SOLVE_QUOTA solves, then the bank is Pro) and
// `companySetGate` (a signed company set frees its first
// COMPANY_SET_FREE_COUNT in the company view). The copy ships in the same
// commit as the flip, so the guards read the flag and demand the copy that
// matches it — in either state. A page that says "10 free challenge solves"
// while the quota is off is as wrong as one that says "228 free" while it is on.
//
// Read from the source, like every other flag guard in tests/: the flags file
// assigns to window and is not importable in node.
//
// FREE_TIER_FLAGS=on (or =off) overrides both, so the suite can be run in the
// other state before a flip without touching the flags file:
//   FREE_TIER_FLAGS=on npx vitest run tests/site-counts.test.js
import fs from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function readFlag(src, name) {
  const m = new RegExp(`^\\s+${name}: (true|false),`, 'm').exec(src);
  if (!m) throw new Error(`feature-flags.js has no "${name}: true|false," line`);
  return m[1] === 'true';
}

export function freeTierFlags(src = fs.readFileSync(join(ROOT, 'src/data/feature-flags.js'), 'utf8'), env = process.env.FREE_TIER_FLAGS) {
  if (env === 'on') return { freeQuota: true, companySetGate: true, overridden: true };
  if (env === 'off') return { freeQuota: false, companySetGate: false, overridden: true };
  return { freeQuota: readFlag(src, 'freeQuota'), companySetGate: readFlag(src, 'companySetGate'), overridden: false };
}
