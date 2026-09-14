// Who am I, and what am I on? (founder's ask, 2026-09-14)
//
// "bu test6 kullanıcısı yazmıyor free subscription yazmıyor sağ tepede bunlar
// olmalı ki kullanıcı hangi kullanıcıyla bağlı olduğunu görsün."
//
// Two separate faults produced that screenshot:
//
//  1. BOTH the identity button and the plan chip were gated on
//     `!showSimpleLearningShell` — and that shell is where a first-run
//     visitor spends their entire first session. The one person most likely
//     to wonder whether they are even signed in was the one person who could
//     not see.
//  2. The chip only ever said "👑 PRO" or offered "✨ Pro". A free user was
//     told what they could buy and never what they already had, and an
//     EXPIRED plan rendered identically to one that never existed.
//
// These are source guards because the state combinations (guest / registered
// / trial / pass / expired) are cheap to assert here and expensive to stage in
// a browser; the rendering itself was verified in one.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/app.jsx'), 'utf8');
const header = src.slice(src.indexOf('<header className="bg-black/30'), src.indexOf('</header>'));

// `title={...}` can span lines and nest braces, so a regex cannot take it out
// cleanly — the first attempt stopped at the first newline and reported the
// hover text as if it were rendered. Count the braces instead.
function stripTitles(jsx) {
  let out = '';
  for (let i = 0; i < jsx.length;) {
    const at = jsx.indexOf('title={', i);
    if (at < 0) { out += jsx.slice(i); break; }
    out += jsx.slice(i, at);
    let depth = 0, j = at + 'title='.length;
    for (; j < jsx.length; j++) {
      if (jsx[j] === '{') depth++;
      else if (jsx[j] === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    i = j;
  }
  return out.replace(/title="[^"]*"/g, '');
}



describe('the header says who you are', () => {
  it('renders the identity button in every shell', () => {
    expect(header).toContain('data-testid="header-identity"');
    const at = header.indexOf('data-testid="header-identity"');
    const around = header.slice(Math.max(0, at - 700), at);
    expect(around, 'the identity button is gated on a shell again').not.toMatch(/!showSimpleLearningShell && \($/);
  });

  it('shows the username, not only an avatar, even on a narrow screen', () => {
    const at = header.indexOf('data-testid="header-identity"');
    const btn = header.slice(at, header.indexOf('</button>', at));
    expect(btn).toContain("isGuest ? 'Guest' : currentUser");
    expect(btn, 'the name was hidden below the sm breakpoint — it is the answer to the question').not.toContain('hidden sm:inline');
  });

  it('opens the profile', () => {
    const at = header.indexOf('data-testid="header-identity"');
    expect(header.slice(at - 200, at)).toContain('setShowProfile(true)');
  });
});

// 2026-09-14, second pass. The plan was a full chip here — "👑 Pro · 23 days
// left". The founder cut it: a countdown living permanently in the header
// reads as "your subscription is ending" every time a PAYING customer glances
// at it. The crown moved onto the avatar, the days moved into the profile.
//
// These tests move with it rather than being deleted: the plan must still be
// answerable from the header without opening anything (the title), and the
// upgrade must still exist somewhere reachable (the profile).
describe('the header says what you are on, quietly', () => {
  it('shows a crown on the avatar for a paid plan, and nothing for free', () => {
    expect(header).toContain("headerPlan.tone === 'pro'");
    expect(header).toContain('👑');
    expect(header, 'the full chip is back in the bar').not.toContain('data-testid="header-plan"');
  });

  it('no countdown is DRAWN in the bar — the hover may still carry it', () => {
    // "23 days left" belongs in a hover and in the profile, not in a
    // permanent glance. The first version of this test matched the string
    // anywhere and therefore failed on the title attribute, which is the one
    // place it is wanted; strip the titles first and ask about the rest.
    const withoutTitles = stripTitles(header);
    expect(withoutTitles, 'a days-left countdown is rendered in the header again')
      .not.toMatch(/headerPlan\.detail/);
  });

  it('still answers the question on hover, without opening anything', () => {
    const at = header.indexOf('data-testid="header-identity"');
    const btn = header.slice(Math.max(0, at - 400), header.indexOf('</button>', at));
    expect(btn).toContain('headerPlan.label');
    expect(btn).toContain('headerPlan.detail');
  });

  it('derives the label from the record, never from the resolved boolean', () => {
    // Feeding `userProStatus` back in would flatten an expired plan to a
    // plain "Free" and lose the "Pro ended" that tells a lapsed person apart
    // from someone who never had it.
    expect(src).toContain('const headerPlan = planLabel({');
    expect(src).toContain('proStatus: userProStatus || !!proType');
  });

  it('the upgrade did not vanish with the chip — the profile still sells', () => {
    expect(src).toContain('data-testid="profile-upgrade"');
    expect(src).toContain("type: 'profile_plan'");
  });
});

describe('the profile panel answers the rest', () => {
  // The block starts at its comment: lastLoginDay() is computed in the IIFE
  // above the markup, so slicing from the testid would miss it.
  const start = src.indexOf("{/* Your plan — the founder's ask");
  const panel = src.slice(start, src.indexOf('Guest Mode Warning', start));

  it('exists and carries the subscription, the score, the streak and the last login', () => {
    expect(panel).toContain('Subscription');
    expect(panel).toContain('Score');
    expect(panel).toContain('Solved');
    expect(panel).toContain('Streak');
    expect(panel).toContain('Last login');
    expect(panel).toContain('lastLoginDay(');
  });

  it('never says "Renews" about a plan that cannot renew', () => {
    // proAutoRenew defaults to true in app state, so the flag alone once
    // labelled a 90-day pass "Renews Oct 29" — promising a charge that will
    // never come and hiding the date access really stops.
    expect(panel).toContain('planRenews(data)');
    expect(panel, 'the raw flag is back in the label decision').not.toMatch(/plan\.tone === 'pro' && proAutoRenew/);
  });

  it('offers the upgrade only when there is one, and closes the panel first', () => {
    expect(panel).toContain('plan.canUpgrade &&');
    expect(panel).toContain('setShowProfile(false)');
    expect(panel).toContain("type: 'profile_plan'");
  });
});
