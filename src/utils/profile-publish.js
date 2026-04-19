// Client helpers for the public profile (Phase 4b).
//
// - publishProfile(userData): POST to the publish-profile Edge Function
//   with the current state of the user's skills + stats. Idempotent — the
//   server upserts. Requires Supabase config on window.
//
// - fetchPublicProfile(handle): GET against public_profiles via anon
//   PostgREST. Returns the row or null. Caller renders localStorage
//   fallback when null.
//
// - deriveOwnershipHash(passwordHash): deterministic, stable hash we send
//   as ownership proof. Derives from the user's stored password hash so
//   other browsers with the same password can re-publish, but a bystander
//   who only saw the public handle can't.

import { deriveArchetype, normalizeSkills } from '../components/SkillRadar.jsx';

const FUNCTIONS_BASE = () => {
  const base = (typeof window !== 'undefined' && window.SUPABASE_URL) || '';
  return base.replace(/\/$/, '') + '/functions/v1';
};
const REST_BASE = () => {
  const base = (typeof window !== 'undefined' && window.SUPABASE_URL) || '';
  return base.replace(/\/$/, '') + '/rest/v1';
};
const ANON_KEY = () => (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) || '';

function hasSupabase() {
  return !!(typeof window !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
}

/**
 * Derive a stable ownership token. The server stores it alongside the
 * public_profiles row; subsequent writes must match. We derive from the
 * user's password hash so the secret stays local. If passwordHash is
 * unavailable (legacy saves), fall back to a one-time-generated token
 * stored in localStorage keyed by username.
 */
export function deriveOwnershipHash(username, passwordHash) {
  const normalized = String(username || '').toLowerCase().trim();
  if (!normalized) return null;
  if (passwordHash) {
    // Don't send the raw password hash. Mix in a constant so the emitted
    // token is distinct from anything the client stores.
    return simpleFingerprint(`sqlquest-profile-v1:${normalized}:${passwordHash}`);
  }
  // Fallback: per-device random token. This means re-publishing from a
  // different browser will be refused until the user clears the squat.
  try {
    const key = `sqlquest_profile_token_${normalized}`;
    let tok = localStorage.getItem(key);
    if (!tok) {
      tok = simpleFingerprint(`${normalized}:${Date.now()}:${Math.random()}`);
      localStorage.setItem(key, tok);
    }
    return tok;
  } catch (_) {
    return null;
  }
}

function simpleFingerprint(input) {
  // 32-bit fingerprint expressed as hex. Not cryptographic. The publish
  // endpoint treats it as an opaque string — all we need is stability.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const out = (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  );
  return out;
}

/**
 * Upload the current user's profile snapshot to Supabase.
 *
 * @param {Object} params
 * @param {string} params.username
 * @param {string} [params.passwordHash] — optional, strengthens ownership.
 * @param {Object} params.skills — normalized skill levels map.
 * @param {number} params.totalSolves
 * @param {number} params.streak
 * @param {number} params.xp
 * @returns {Promise<{ok:boolean, url?:string, error?:string}>}
 */
export async function publishProfile({
  username,
  passwordHash = '',
  skills = {},
  totalSolves = 0,
  streak = 0,
  xp = 0,
}) {
  if (!hasSupabase()) {
    return { ok: false, error: 'supabase_not_configured' };
  }
  const handle = String(username || '').toLowerCase().trim();
  if (!handle) return { ok: false, error: 'no_handle' };
  const ownershipHash = deriveOwnershipHash(handle, passwordHash);
  if (!ownershipHash) return { ok: false, error: 'no_ownership_hash' };

  const normalized = normalizeSkills(skills || {});
  const archetype = deriveArchetype(normalized);

  try {
    const res = await fetch(`${FUNCTIONS_BASE()}/publish-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY(),
        Authorization: `Bearer ${ANON_KEY()}`,
      },
      body: JSON.stringify({
        handle,
        display_name: username,
        ownership_hash: ownershipHash,
        skills: normalized,
        total_solves: totalSolves,
        streak,
        xp,
        archetype_name: archetype.name,
        archetype_emoji: archetype.emoji,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body.error || `http_${res.status}` };
    }
    return { ok: true, url: body.url };
  } catch (e) {
    return { ok: false, error: 'network_error', detail: String(e) };
  }
}

/**
 * Fetch a profile by handle from public_profiles. Returns null if missing
 * or if Supabase isn't configured (caller should fall back to local data).
 */
export async function fetchPublicProfile(handle) {
  if (!hasSupabase()) return null;
  const h = String(handle || '').toLowerCase().trim();
  if (!h) return null;
  try {
    const url = `${REST_BASE()}/public_profiles?handle=eq.${encodeURIComponent(h)}&select=handle,display_name,skills,total_solves,streak,xp,archetype_name,archetype_emoji,updated_at`;
    const res = await fetch(url, {
      headers: {
        apikey: ANON_KEY(),
        Authorization: `Bearer ${ANON_KEY()}`,
      },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (_) {
    return null;
  }
}

/**
 * Build the OG image URL for a handle. Used in <meta property="og:image">
 * when the page renders, so share platforms see a rich card.
 */
export function ogImageUrl(handle) {
  const base = (typeof window !== 'undefined' && window.SUPABASE_URL) || '';
  if (!base || !handle) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/og-profile?handle=${encodeURIComponent(handle)}`;
}
