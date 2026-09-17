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
    // It lives in the panel's one Subscription Section, which already had an
    // Upgrade for free users before today. My own duplicate block carried a
    // second one; removing the duplicate removed that, not the path.
    const sub = src.slice(src.indexOf('{/* Subscription Section */}'));
    expect(sub.slice(0, 4500)).toContain('setShowProModal');
  });
});

// 2026-09-14, third pass. This block was headed SUBSCRIPTION and repeated the
// plan, the renew date and the days left — but a "Subscription Section" with
// the Manage button and the auto-renew toggle already existed further down,
// so the panel showed the same subscription twice. That was my miss when I
// added it. The plan rows moved out; what is left is the progress people come
// here to check, and these tests follow.
describe('the profile panel answers the rest', () => {
  // The block starts at its comment: lastLoginDay() is computed in the IIFE
  // above the markup, so slicing from the testid would miss it.
  const start = src.indexOf('{/* Progress — the facts people come here to check');
  const panel = src.slice(start, src.indexOf('Guest Mode Warning', start));

  it('carries the progress facts, and no longer a second copy of the plan', () => {
    // Strip the comments first: this block's own comment explains the history
    // and necessarily contains the word.
    const markup = panel.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(markup, 'the plan is back in two places').not.toContain('SUBSCRIPTION');
    expect(src, 'the one subscription home must still exist').toContain("i18n_t('profile', 'subscriptionTitle')");
    expect(panel).toContain('Score');
    expect(panel).toContain('Solved');
    expect(panel).toContain('Streak');
    expect(panel).toContain('Last login');
    expect(panel).toContain('lastLoginDay(');
  });
});

// The Invite link credited nobody (2026-09-14).
//
// The panel's Invite section renders `getAppUrl()`, which appends `?ref=` ONLY
// when `referralCode` is set — and `referralCode` was fetched by an effect
// gated on `showReferralModal`. Open the profile without opening the Referral
// Hub and the copied link was a bare app URL.
//
// Measured the same day: 363 of 363 non-guest accounts have a
// personal_ref_code in the database, a trigger assigns them, and the
// referrals table holds ZERO rows from a personal code, ever. 0 referral
// conversions in the product's history. The server side was never the
// problem — the link was.
describe('the invite link carries a code, or is not offered', () => {
  const invite = src.slice(src.indexOf('{/* Invite Friends Section */}'),
    src.indexOf('{/* Subscription Section */}', src.indexOf('{/* Invite Friends Section */}')));

  it('fetches the code when the profile opens, not only the referral hub', () => {
    const eff = src.slice(src.indexOf('if ((!showReferralModal'), src.indexOf('if ((!showReferralModal') + 400);
    expect(eff).toContain('!showProfile');
    expect(src).toContain('}, [showReferralModal, showProfile, currentUser]);');
  });

  it('shows no URL at all until the code is known', () => {
    // A bare app URL looks like a working referral link and is not one.
    expect(invite).toContain('value={referralCode ? getAppUrl() : \'\'}');
    expect(invite, 'the raw getAppUrl() is back in the field').not.toMatch(/value=\{getAppUrl\(\)\}/);
  });

  it('will not copy a link that credits nobody', () => {
    expect(invite).toContain('disabled={!referralCode}');
    expect(invite).toContain('if (!referralCode) return;');
  });
});

// What the founder cut on 2026-09-14, with the reason each was cut, so a
// future pass does not quietly put them back.
describe('the profile panel stays trimmed', () => {
  const panel = src.slice(src.indexOf('{showProfile && ('), src.indexOf('{showProfile && (') + 30000);

  it('has no stats grid — it repeated Solved and contradicted itself on Queries', () => {
    expect(panel).not.toContain("i18n_t('profile', 'statAiLessons')");
  });

  it('has no share section — 3 clicks by 3 people in 90 days', () => {
    expect(panel).not.toContain("i18n_t('profile', 'btnProgressCard')");
  });

  it('has no query history — red failed attempts are debug output', () => {
    expect(panel).not.toContain('{/* Query History */}');
  });

  it('has no export/import — it contradicted the Synced badge above it', () => {
    expect(panel).not.toContain('{/* Sync Profile Section */}');
  });

  it('still has the four things the panel exists for', () => {
    expect(panel).toContain('data-testid="profile-progress"');
    expect(panel).toContain('data-testid="profile-settings"');
    expect(panel).toContain("i18n_t('profile', 'subscriptionTitle')");
    expect(panel).toContain('handleLogout');
  });
});

// Interview-first (2026-09-17, docs/plans/interview-first-2026-09-17.md).
// The header's lives and coin are game surfaces; an interview person under
// `interviewFirst` does not see them. The founder's 09-14 count — logo ·
// level · streak · lives · coin · notifications · avatar, seven — becomes
// five for that person: logo · level · streak · notifications · avatar. The
// identity button and the streak are NOT part of the cut, and the cut is
// exactly one gate, on the one helper.
describe('the header for an interview person: lives and coin out, identity and streak stay', () => {
  it('the lives and the coin sit behind the one interview-first gate', () => {
    const gate = header.indexOf("!interviewFirstOn('header_game_cluster')");
    expect(gate, 'the gate is gone from the header').toBeGreaterThan(-1);
    const gated = header.slice(gate, header.indexOf('</>', gate));
    expect(gated).toContain('title="Lives"');
    expect(gated).toContain('title="XP"');
    expect(header.split('interviewFirstOn(').length - 1, 'one gate in the header, not two').toBe(1);
  });

  it('the streak is drawn before the gate, the identity after it, neither inside it', () => {
    const gate = header.indexOf("!interviewFirstOn('header_game_cluster')");
    const gateEnd = header.indexOf('</>', gate);
    expect(header.indexOf('<PixelFlame')).toBeLessThan(gate);
    expect(header.indexOf('data-testid="header-identity"')).toBeGreaterThan(gateEnd);
  });
});
