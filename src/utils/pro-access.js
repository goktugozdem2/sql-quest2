// Who is Pro, decided from stored user data — and, separately, who may be ASKED
// to buy. Extracted from app.jsx on 2026-09-07 with the incident below.
//
// ── The incident ────────────────────────────────────────────────────────────
// The login restore block granted Pro to itself. Its shape was:
//
//     } else if (userData.proAutoRenew) {
//       // Expired but auto-renew is on - extend by 30 days
//       const newExpiry = new Date();
//       newExpiry.setDate(newExpiry.getDate() + 30);
//       userData.proExpiry = newExpiry.toISOString();
//       userData.proStatus = true;
//       setProType('monthly');
//       saveUserData(username, userData);   // ← and wrote it back to the cloud
//     }
//
// So a 7-day trial whose `proAutoRenew` was left true became a permanent
// subscription: every login pushed the expiry another 30 days out, relabelled
// the account `monthly`, and saved it. No payment was ever involved, and
// because the resulting expiry always sat in the future, `proLiveForOffer`
// (app.jsx) considered these people paying customers and exempted them from
// every upgrade prompt. Measured 2026-09-07: 47 accounts carried
// `proStatus: true` with no `stripe_webhook` row; 4 of them had
// `proAutoRenew: true` and were being renewed by this branch; 2 were active in
// the last 30 days. The worst case was the single most engaged account on the
// site — 112 solves, active that day, labelled `monthly`, never asked to buy,
// never charged a cent.
//
// ── The rule this file encodes ──────────────────────────────────────────────
// **The client never grants, extends or relabels Pro.** Stripe does, through
// `supabase/functions/stripe-webhook` (`checkout.session.completed` and
// `invoice.payment_succeeded`, which writes the new `proExpiry` server-side),
// and through the `pending_subscriptions` claim for people who paid before
// signing up. Everything here is a pure read of what those wrote.
//
// The one concession is GRACE_DAYS: a renewal invoice is paid at the moment
// the old period ends, so a subscriber who opens the app in the gap before the
// webhook lands would otherwise be told their subscription is over. Three days
// of read-only grace covers that gap. It is not a grant — the stored expiry
// never moves, so grace expires with it and cannot repeat.
//
// Trials get no grace: nothing renews a trial, so a trial past its expiry is
// simply over.

export const GRACE_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Decide Pro access from stored user data. Pure: it reads, it never writes.
 *
 * @param {object} data  the stored user record ({ proStatus, proType, proExpiry, ... })
 * @param {number} now   epoch ms (injected so tests are not clock-dependent)
 * @returns {{
 *   isPro: boolean,        // grants content access
 *   proType: string|null,  // preserved as stored — never rewritten
 *   proExpiry: string|null,
 *   inGrace: boolean,      // access is only the post-expiry webhook-lag window
 *   expired: boolean,      // had Pro, the stored expiry has passed
 *   reason: 'none'|'lifetime'|'active'|'grace'|'expired'
 * }}
 */
export function resolveProAccess(data, now = Date.now()) {
  const d = data || {};
  const proType = d.proType || null;
  const proExpiry = d.proExpiry || null;

  if (d.proStatus !== true) {
    return { isPro: false, proType: null, proExpiry: null, inGrace: false, expired: false, reason: 'none' };
  }

  if (proType === 'lifetime') {
    return { isPro: true, proType, proExpiry, inGrace: false, expired: false, reason: 'lifetime' };
  }

  const expiry = toTime(proExpiry);
  // No expiry and not lifetime is not a subscription. Historically this was
  // treated as expired, and it stays that way.
  if (expiry === null) {
    return { isPro: false, proType, proExpiry, inGrace: false, expired: true, reason: 'expired' };
  }

  if (expiry > now) {
    return { isPro: true, proType, proExpiry, inGrace: false, expired: false, reason: 'active' };
  }

  // Past the stored expiry. A paid plan gets the webhook-lag window; a trial
  // does not, because nothing renews a trial. `quarterly` DOES renew (it
  // bills every three months), so it gets the window like monthly and annual.
  const NON_RENEWING = ['trial'];
  const isPaidPlan = proType && !NON_RENEWING.includes(proType);
  if (isPaidPlan && now - expiry <= GRACE_DAYS * MS_PER_DAY) {
    return { isPro: true, proType, proExpiry, inGrace: true, expired: true, reason: 'grace' };
  }

  // Expired. proType and proExpiry are preserved on purpose: the trial-ended
  // banner and the post-expiry modal need to know this person HAD Pro, or an
  // expired trial looks identical to someone who never started one.
  return { isPro: false, proType, proExpiry, inGrace: false, expired: true, reason: 'expired' };
}

/**
 * May this person be shown an upgrade offer?
 *
 * Not simply `!isPro`: someone inside the grace window is a paying customer
 * whose invoice is in flight, and must not be asked to buy what they already
 * bought. Everyone else without live access may be asked — including the
 * expired-trial population the old raw `proStatus` flag used to exempt.
 */
export function mayBeOffered(data, now = Date.now()) {
  const access = resolveProAccess(data, now);
  if (access.reason === 'lifetime' || access.reason === 'active' || access.reason === 'grace') return false;
  return true;
}

/**
 * True when the stored record claims Pro but the resolver denies it — the
 * shape of every account the auto-renew branch had been minting. Callers use
 * it to stamp analytics (`staleProRecovered`), never to change behaviour.
 */
export function hasStaleProFlag(data, now = Date.now()) {
  return (data || {}).proStatus === true && !resolveProAccess(data, now).isPro;
}

/**
 * What to print next to someone's name (2026-09-14, founder's ask: "kullanıcı
 * hangi kullanıcıyla bağlı olduğunu görsün… orda subscription tipi yazmalı").
 *
 * The header used to show either a gold "👑 PRO" pill or an "✨ Pro" upsell
 * button, so a free user was told what they could BUY and never what they
 * currently HAVE. "Free" is a plan and saying so is not a weaker message: a
 * person who cannot see their own plan also cannot see that it ran out.
 *
 * Pure, and derived from the same record as resolveProAccess — never from the
 * raw `proStatus` flag, which is exactly what made 47 accounts look like
 * subscribers in September.
 *
 * @returns {{ label, tone: 'pro'|'free', detail: string|null, canUpgrade: boolean }}
 */
export function planLabel(data, now = Date.now()) {
  const a = resolveProAccess(data, now);
  const days = a.proExpiry ? Math.ceil((new Date(a.proExpiry).getTime() - now) / MS_PER_DAY) : null;
  const left = days === null ? null : days <= 0 ? 'ends today' : days === 1 ? '1 day left' : `${days} days left`;

  if (a.reason === 'lifetime') return { label: 'Pro · Lifetime', tone: 'pro', detail: null, canUpgrade: false };
  if (a.reason === 'active' || a.reason === 'grace') {
    if (a.proType === 'quarterly') return { label: 'Pro · Quarterly', tone: 'pro', detail: left, canUpgrade: false };
    if (a.proType === 'trial') return { label: 'Pro trial', tone: 'pro', detail: left, canUpgrade: true };
    return { label: 'Pro', tone: 'pro', detail: left, canUpgrade: false };
  }
  // Expired says so. An expired trial and someone who never started one look
  // identical on the raw flag, and telling them apart is the whole reason
  // proType survives expiry.
  if (a.expired && a.proType) {
    const what = a.proType === 'trial' ? 'Trial ended' : 'Pro ended';
    return { label: 'Free', tone: 'free', detail: what, canUpgrade: true };
  }
  return { label: 'Free', tone: 'free', detail: null, canUpgrade: true };
}

/** The most recent day this person was here: 'YYYY-MM-DD', or null. */
export function lastLoginDay(data) {
  const cal = data && data.loginCalendar;
  if (cal && typeof cal === 'object') {
    const days = Object.keys(cal).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
    if (days.length) return days[days.length - 1];
  }
  const t = data && data.lastActive ? new Date(data.lastActive).getTime() : NaN;
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/**
 * Does this plan actually renew? Never trust `proAutoRenew` alone.
 *
 * It defaults to TRUE in the app's state and is written by Stripe, so a
 * lifetime or a trial whose flag was never set would otherwise be labelled
 * "Renews", promising the buyer a charge that will never happen and hiding
 * the date their access really stops. Only the three subscriptions renew.
 */
export function planRenews(data) {
  const d = data || {};
  if (!d.proAutoRenew) return false;
  return d.proType === 'monthly' || d.proType === 'quarterly' || d.proType === 'annual';
}
