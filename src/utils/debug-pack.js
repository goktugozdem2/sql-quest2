// The Debug pack — the Debug set sold on its own (founder's decision
// 2026-11-23, PR #251): $9 once (India $3), Pro includes it. The client's
// pure half; the money half is supabase/functions/create-checkout-session
// (`product: 'debug_pack'`, a one-time `mode: 'payment'` session) and
// supabase/functions/stripe-webhook (users.data.debugPackOwned, written by
// the service role only and kept by sq_save_user — migration
// 20261123150000_debug_pack_server_owned.sql).
//
// THE RULES THIS FILE ENCODES
//   1. The pack unlocks Debug items and nothing else: never another Hard,
//      never the free quota for a non-Debug challenge. `proForChallenge` is
//      the one place a lock check asks "does this person have access to THIS
//      challenge as if they were Pro?" — app.jsx passes its answer as `isPro`
//      to the existing gates (isContentLocked, quotaGate, companySetGate).
//   2. Ownership is the server's record, never the flag. A buyer keeps the
//      items when `debugPack` is off; the flag only decides whether the pack
//      is OFFERED.
//   3. The pack is offered only in the modal a locked Debug item opens
//      (reason `debug_lock`), only to someone who has neither Pro nor the
//      pack.
//   4. No Payment Link fallback. A session that fails shows one line and the
//      person may try again — a link for the wrong product is worse than none.
//
// Pure: no window, no document, no localStorage.

import { isDebugChallenge, DEBUG_LOCK_REASON } from './debug-questions.js';
import { USERNAME_RE, EMAIL_RE, CHECKOUT_REGIONS, STRIPE_CHECKOUT_URL_RE } from './checkout-session.js';
import { debugPackPrice } from './regional-price.js';

export const DEBUG_PACK_PRODUCT = 'debug_pack';
export const DEBUG_PACK_PURCHASED_EVENT = 'debug_pack_purchased';

/** The offer is on only when the flag is literally true (a missing key reads true in FF). */
export const debugPackOn = (flags) =>
  !!(flags && flags.features && flags.features.debugPack === true);

/**
 * Does this record own the pack? The webhook writes
 * `{ at, sessionId, paymentIntent, amount, currency }`; anything else —
 * `true`, a string, an empty object — is not ownership.
 */
export function ownsDebugPack(record) {
  return !!(record && typeof record === 'object' && !Array.isArray(record)
    && typeof record.at === 'string' && record.at
    && typeof record.sessionId === 'string' && record.sessionId);
}

/** The pack unlocks THIS challenge: a Debug item, for an owner. */
export const debugPackUnlocks = (challenge, packRecord) =>
  isDebugChallenge(challenge) && ownsDebugPack(packRecord);

/**
 * The one lock question: does this person get THIS challenge as a Pro user
 * would? Pro → yes, for everything. The pack → yes, for Debug items only.
 */
export function proForChallenge({ isPro, challenge, packRecord } = {}) {
  if (isPro === true) return true;
  return debugPackUnlocks(challenge, packRecord);
}

/**
 * Is a Pro-modal reason a Debug lock? The stamp is #252's withDebugLock
 * (src/utils/debug-questions.js: the wall's own reason plus
 * `debugLock: true`, labelled `debug_lock` by proModalReasonLabel); a bare
 * `type: 'debug_lock'` counts too.
 */
export function isDebugLockReason(reason) {
  return !!(reason && typeof reason === 'object'
    && (reason.debugLock === true || reason.type === DEBUG_LOCK_REASON));
}

/** Show the pack card in this modal? */
export function debugPackOffered({ flagOn, reason, isPro, packRecord } = {}) {
  return flagOn === true && isPro !== true && !ownsDebugPack(packRecord) && isDebugLockReason(reason);
}

// The card's words, EN and TR. The price is the region's own, from
// regional-price.js — never a second copy here.
export function debugPackCopy(lang = 'en', region = 'default') {
  const price = debugPackPrice(region);
  if (lang === 'tr') {
    return {
      line: `Debug seti — bir kez ${price}, hep senin. Pro'da zaten var.`,
      cta: `Debug setini al — ${price}`,
      error: 'Ödeme sayfası açılamadı — tekrar dene.',
      opened: 'Debug seti senin. Hepsi açık.',
      pending: 'Ödeme alındı; Debug seti birkaç dakika içinde açılacak.',
    };
  }
  return {
    line: `Debug set — ${price} once, yours to keep. Pro includes it.`,
    cta: `Get the Debug set — ${price}`,
    error: "Couldn't open checkout — try again.",
    opened: 'The Debug set is yours. Every item is open.',
    pending: 'Payment received; the Debug set opens within a few minutes.',
  };
}

/**
 * The request body for create-checkout-session, or null when the inputs
 * cannot make a valid one. No trial, no promo: a one-time $9 has neither.
 */
export function buildDebugPackSessionBody({ username, email, region } = {}) {
  const user = String(username || '');
  if (!USERNAME_RE.test(user)) return null;
  const body = {
    product: DEBUG_PACK_PRODUCT,
    region: CHECKOUT_REGIONS.includes(region) ? region : 'default',
    username: user,
  };
  const mail = String(email || '').trim().toLowerCase();
  if (mail && mail.length <= 254 && EMAIL_RE.test(mail)) body.email = mail;
  return body;
}

/**
 * Open the pack's checkout. `request` resolves to { url } (requestCheckoutSession);
 * on ANY failure `onError(reason)` runs and nothing navigates — there is no
 * Payment Link for the pack, by design.
 *
 * @returns {Promise<{ via: 'session'|'error', reason: string|null }>}
 */
export async function launchDebugPack({ request, navigate, onError } = {}) {
  const fail = (reason) => { try { if (typeof onError === 'function') onError(reason); } catch { /* ignore */ } return { via: 'error', reason }; };
  if (typeof request !== 'function') return fail('no_request');
  let result;
  try {
    result = await request();
  } catch (err) {
    return fail((err && err.message) || 'error');
  }
  if (!result || !STRIPE_CHECKOUT_URL_RE.test(String(result.url || ''))) return fail('bad_url');
  try {
    navigate(result.url);
  } catch {
    return fail('navigate_failed');
  }
  return { via: 'session', reason: null };
}

/** Is this landing the pack's return from Stripe (`?payment=success&product=debug_pack`)? */
export function isDebugPackReturn(search) {
  try {
    const p = new globalThis.URLSearchParams(String(search || ''));
    return p.get('payment') === 'success' && p.get('product') === DEBUG_PACK_PRODUCT;
  } catch {
    return false;
  }
}
