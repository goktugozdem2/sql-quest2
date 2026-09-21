// The leaderboard (removed 2026-09-22). Nobody could open it — the nav that
// held it had been switched off (showLegacyPrimaryNav = false) and nothing
// else set the tab — yet every open session reloaded it every 30 seconds with
// a 1.3 s full-table query: ~39 hours of database time in nine days and the
// Supabase "running out of Disk IO Budget" warning of 2026-09-21. Half-left
// code is where the next surprise like that comes from, so it is gone.
// The invite entry lives on in the profile panel.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

describe('the leaderboard is gone, not hidden', () => {
  it('no loader, no poll, no tab, no nav entry', () => {
    expect(app).not.toMatch(/loadLeaderboard|saveToLeaderboard|setLeaderboard|calculateLeaderboardPercentile/);
    expect(app).not.toContain("activeTab === 'leaderboard'");
    expect(app).not.toContain("id: 'leaderboard'");
    expect(app).not.toContain('leaderboard_public');
  });
  it('no read of any account list remains', () => {
    expect(app).not.toMatch(/order=data-?>/);
  });
  it('the invite modal still has an entry point', () => {
    expect(app).toContain('setShowProfile(false); setShowReferralModal(true);');
  });
});
