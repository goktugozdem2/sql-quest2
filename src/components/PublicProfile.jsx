import React, { useState, useEffect } from 'react';
import SkillRadar, { DEFAULT_SKILLS, DEFAULT_META, normalizeSkills, deriveArchetype } from './SkillRadar.jsx';
import { copyOrDownloadRadarPng, buildShareUrl } from '../utils/radar-export.js';
import { fetchPublicProfile, ogImageUrl } from '../utils/profile-publish.js';

/**
 * PublicProfile — /u/:handle route. The shareable identity page.
 *
 * Phase 4a (this commit): reads from localStorage when the visitor IS the
 * profile owner (same browser, same username). Shows a "This profile isn't
 * public yet" state for everyone else, with a CTA to sign up. Not yet
 * backed by Supabase — that's Phase 4b.
 *
 * The point of this page is the viral URL: users screenshot it, share it,
 * post it. Design priorities: radar is the hero, archetype label is the
 * headline, share is one click away.
 */
export default function PublicProfile({ handle, currentUsername, appUrl = 'sqlquest.io', onClaim }) {
  const normalizedHandle = (handle || '').toLowerCase().trim();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareStatus, setShareStatus] = useState('idle'); // 'idle' | 'copying' | 'copied'

  useEffect(() => {
    // Phase 4b data source: try Supabase public_profiles FIRST (cross-device
    // reads work that way). Fall back to localStorage for the owner viewing
    // their own /u/:handle in their own browser before they've published.
    // Missing from both → not-found state with signup CTA.
    let cancelled = false;
    setLoading(true);
    (async () => {
      let hit = null;
      try {
        const row = await fetchPublicProfile(normalizedHandle);
        if (row) {
          hit = {
            handle: row.handle,
            skills: row.skills || {},
            totalSolves: row.total_solves || 0,
            streak: row.streak || 0,
            xp: row.xp || 0,
            source: 'supabase',
          };
        }
      } catch (_) { /* fall through */ }
      if (!hit) {
        try {
          const raw = localStorage.getItem(`sqlquest_user_${normalizedHandle}`);
          if (raw) {
            const data = JSON.parse(raw);
            hit = {
              handle: normalizedHandle,
              skills: (data.weaknessTracking && data.weaknessTracking.skillLevels) || {},
              totalSolves: (data.solvedChallenges || []).length,
              streak: data.streak || 0,
              xp: data.xp || 0,
              source: 'local',
            };
          }
        } catch (_) { /* noop */ }
      }
      if (!cancelled) {
        setProfile(hit);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [normalizedHandle]);

  // Inject OG meta tags into <head> so bots and link unfurlers see the right
  // card. Bots don't run JS, so this helps users who share URLs within apps
  // that render client-side previews (Notion, many chat clients); Twitter /
  // LinkedIn read server-rendered HTML and won't see these — for those we'd
  // need a Vercel Edge Function that injects meta tags at the /u/:handle
  // route. That's a bigger lift, deferred.
  useEffect(() => {
    if (typeof document === 'undefined' || !profile) return;
    const archetype = deriveArchetype(normalizeSkills(profile.skills || {}));
    const title = `${archetype.name} · SQL Quest · @${normalizedHandle}`;
    const desc = `${archetype.tagline} — see your own SQL shape at sqlquest.io`;
    const img = ogImageUrl(normalizedHandle);
    document.title = title;
    setMeta('og:title', title);
    setMeta('og:description', desc);
    setMeta('og:type', 'profile');
    setMeta('og:url', `https://${appUrl.replace(/^https?:\/\//, '')}/u/${normalizedHandle}/`);
    if (img) setMeta('og:image', img);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    if (img) setMeta('twitter:image', img);
  }, [profile, normalizedHandle, appUrl]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading profile…</div>
      </div>
    );
  }

  const isOwnProfile = currentUsername && currentUsername.toLowerCase() === normalizedHandle;
  const profileUrl = `https://${appUrl.replace(/^https?:\/\//, '')}/u/${normalizedHandle}`;

  // ── Profile-not-found state ─────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🧭</div>
          <h1 className="text-3xl font-bold mb-2">This shape hasn't been claimed yet</h1>
          <p className="text-gray-400 mb-6">
            <code className="text-purple-300">@{normalizedHandle}</code> doesn't have a SQL Quest profile, or hasn't shared it publicly yet.
          </p>
          <div className="bg-gradient-to-r from-yellow-400/10 to-purple-500/10 border border-yellow-400/30 rounded-xl p-5 mb-6">
            <p className="text-yellow-300 font-bold text-lg mb-1">Claim your own SQL shape</p>
            <p className="text-sm text-gray-400 mb-4">Take the placement, start solving, and your radar becomes your shareable identity.</p>
            <button
              onClick={() => {
                if (typeof onClaim === 'function') onClaim();
                else window.location.href = '/';
              }}
              className="w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg transition"
            >
              Start free →
            </button>
          </div>
          <a href="/" className="text-sm text-purple-400 hover:text-purple-300 underline">
            ← Back to SQL Quest
          </a>
        </div>
      </div>
    );
  }

  // ── Normal profile render ───────────────────────────────────────
  const normalized = normalizeSkills(profile.skills);
  const vals = Object.values(normalized).filter(v => typeof v === 'number');
  const overall = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;
  const archetype = deriveArchetype(normalized);

  // Top 3 and weakest 3 skills
  const sorted = [...DEFAULT_SKILLS].sort((a, b) => (normalized[b] || 0) - (normalized[a] || 0));
  const top3 = sorted.slice(0, 3);
  const weak3 = [...sorted].reverse().slice(0, 3);

  const handleShare = async () => {
    setShareStatus('copying');
    try {
      await copyOrDownloadRadarPng(normalized, {
        handle: `@${normalizedHandle}`,
        brandUrl: appUrl.replace(/^https?:\/\//, ''),
        filename: `sql-quest-${normalizedHandle}.png`,
      });
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (_) {
      setShareStatus('idle');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setShareStatus('copied-link');
      setTimeout(() => setShareStatus('idle'), 2500);
    } catch (_) { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header strip */}
        <div className="flex items-center justify-between mb-6">
          <a href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <span className="text-xl">🧭</span>
            <span className="font-bold text-white">SQL Quest</span>
          </a>
          {isOwnProfile && (
            <span className="text-xs px-2.5 py-1 bg-yellow-400/20 text-yellow-300 rounded-full font-semibold border border-yellow-400/40">
              This is your profile
            </span>
          )}
        </div>

        {/* Archetype hero */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">{archetype.emoji}</div>
          <p className="text-xs text-yellow-300 font-bold uppercase tracking-widest mb-2">@{normalizedHandle}'s SQL archetype</p>
          <h1 className="text-4xl md:text-5xl font-black mb-3">{archetype.name}</h1>
          <p className="text-gray-400 max-w-xl mx-auto">{archetype.tagline}</p>
        </div>

        {/* Radar + stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-center">
          <div className="flex justify-center">
            <div className="bg-black/20 rounded-2xl p-6 border border-purple-500/20">
              <SkillRadar
                skills={normalized}
                size={320}
                showLabels={true}
                showScores={true}
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-400/10 to-purple-500/10 border border-yellow-400/30 rounded-xl p-5">
              <p className="text-[10px] text-yellow-300 font-bold uppercase tracking-widest">Overall</p>
              <p className="text-5xl font-black text-white">{overall}<span className="text-xl text-gray-500">/100</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 border border-gray-700 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Solved</p>
                <p className="text-2xl font-bold text-white">{profile.totalSolves}</p>
              </div>
              <div className="bg-black/30 border border-gray-700 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Streak</p>
                <p className="text-2xl font-bold text-white">{profile.streak}<span className="text-base text-orange-400 ml-1">🔥</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths + weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-green-500/5 border border-green-500/30 rounded-xl p-5">
            <p className="text-xs text-green-400 font-bold uppercase tracking-widest mb-3">Strongest</p>
            <div className="space-y-2">
              {top3.map(skill => {
                const v = normalized[skill] || 0;
                const m = DEFAULT_META[skill] || { icon: '·' };
                return (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{m.icon}</span>
                    <span className="flex-1 text-sm text-gray-200 truncate">{skill}</span>
                    <span className="text-sm font-bold text-green-400">{v}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-5">
            <p className="text-xs text-yellow-400 font-bold uppercase tracking-widest mb-3">Growing</p>
            <div className="space-y-2">
              {weak3.map(skill => {
                const v = normalized[skill] || 0;
                const m = DEFAULT_META[skill] || { icon: '·' };
                return (
                  <div key={skill} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">{m.icon}</span>
                    <span className="flex-1 text-sm text-gray-200 truncate">{skill}</span>
                    <span className="text-sm font-bold text-yellow-400">{v > 0 ? `${v}%` : 'New'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Share row */}
        <div className="bg-black/30 border border-purple-500/30 rounded-2xl p-5 mb-8">
          <p className="text-sm font-bold text-white mb-3">Share this shape</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShare}
              disabled={shareStatus === 'copying'}
              className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg text-sm transition disabled:opacity-60"
            >
              {shareStatus === 'copied' ? '✓ PNG copied' : shareStatus === 'copying' ? '…' : '📋 Copy PNG'}
            </button>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-sm transition border border-gray-700"
            >
              {shareStatus === 'copied-link' ? '✓ Link copied' : '🔗 Copy link'}
            </button>
            <a
              href={buildShareUrl('twitter', { skills: normalized, brandUrl: appUrl.replace(/^https?:\/\//, '') })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-sm transition border border-gray-700"
            >
              🐦 Twitter
            </a>
            <a
              href={buildShareUrl('linkedin', { skills: normalized, brandUrl: appUrl.replace(/^https?:\/\//, '') })}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-sm transition border border-gray-700"
            >
              💼 LinkedIn
            </a>
          </div>
        </div>

        {/* Footer CTA */}
        {!isOwnProfile && (
          <div className="text-center py-6 border-t border-gray-800">
            <p className="text-gray-400 mb-3">Curious what YOUR SQL shape looks like?</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg transition"
            >
              Take the placement →
            </a>
          </div>
        )}

        {/* Silent-brand footer */}
        <div className="text-center text-xs text-gray-600 mt-8">
          Made on <a href="/" className="text-purple-400 hover:text-purple-300">SQL Quest</a>
        </div>
      </div>
    </div>
  );
}

// Set-or-insert a meta tag. Works for og:, twitter:, and plain name-style
// meta. Used to dynamically populate the page's share card metadata.
function setMeta(key, value) {
  if (typeof document === 'undefined') return;
  const isOg = key.startsWith('og:') || key.startsWith('twitter:');
  const attr = isOg ? 'property' : 'name';
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value || '');
}

/**
 * Parses /u/:handle out of the current URL path. Returns handle string or null.
 * Handles /u/foo, /u/foo/, and decoded URI components.
 */
export function parsePublicProfileHandle(pathname = '') {
  const match = /^\/u\/([^/?#]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).toLowerCase().trim();
  } catch (_) {
    return null;
  }
}
