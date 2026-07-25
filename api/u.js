// Server-rendered Open Graph tags for /u/:handle.
//
// WHY THIS EXISTS
// ---------------
// /u/:handle used to rewrite straight to /app.html. The React app then
// injected og: meta tags on the client. Every social platform scrapes the
// SERVER response and never runs our JS, so every shared profile unfurled
// as the generic "SQL Quest - Learn SQL Through Play" card — the same card
// for all 132 published profiles. A share loop whose shares all look
// identical is not a share loop.
//
// This function serves the SAME app.html to humans and scrapers, with the
// title/og/twitter block rewritten for the handle. No cloaking: one
// response, one body, everybody gets the app.
//
// Wired up by the `/u/(.*)` rewrite in vercel.json.
//
// ESM, not CJS: package.json declares "type": "module", so a `require` here
// would throw at cold start. (api/chat.js still uses module.exports and is
// almost certainly dead for that reason — it's documented as legacy.)
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://abmgtjafghpupaqsjnwe.supabase.co';
// Anon key. Public by design — it is already shipped in app.js and is only
// good for the RLS-guarded anon SELECT on public_profiles.
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

const SITE = 'https://sqlquest.app';

// Handles are created by publish-profile, which lowercases and strips to
// [a-z0-9_-]. Anything else can't exist in the table, so reject it before
// spending a network call — and before it reaches the HTML.
const HANDLE_RE = /^[a-z0-9_-]{1,40}$/;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The two or three skills this person is actually strongest at. This is the
// line that makes one profile's card different from another's, so it does
// the real work of the unfurl.
function topSkills(skills, n) {
  if (!skills || typeof skills !== 'object') return [];
  return Object.entries(skills)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function buildDescription(p) {
  const top = topSkills(p.skills, 3);
  const bits = [];
  if (p.total_solves) bits.push(`${p.total_solves} SQL challenges solved`);
  if (p.streak > 0) bits.push(`${p.streak}-day streak`);
  if (top.length) bits.push(`strongest in ${top.join(', ')}`);
  if (!bits.length) return 'SQL skill profile on SQL Quest.';
  return `${bits.join(' · ')}.`;
}

function metaBlock(p, handle) {
  const name = p.display_name || handle;
  const emoji = p.archetype_emoji || '';
  const arche = p.archetype_name || '';
  const title = arche
    ? `${name} — ${emoji} ${arche} | SQL Quest`.replace(/\s+/g, ' ').trim()
    : `${name} — SQL skill profile | SQL Quest`;
  const desc = buildDescription(p);
  const url = `${SITE}/u/${handle}/`;
  // Trailing slash before the query is REQUIRED, not a typo. vercel.json sets
  // trailingSlash:true, which 308-redirects /api/og-card → /api/og-card/.
  // Scrapers vary on whether they follow a redirect for og:image, and the ones
  // that don't would show no card at all — the exact failure this whole change
  // exists to fix. Verified in production: without the slash, 308 text/plain;
  // with it, 200 image/png.
  const img = `${SITE}/api/og-card/?handle=${encodeURIComponent(handle)}`;

  const t = escapeHtml(title);
  const d = escapeHtml(desc);

  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="SQL Quest">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${escapeHtml(img)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${t}">`,
    `<meta name="twitter:description" content="${d}">`,
    `<meta name="twitter:image" content="${escapeHtml(img)}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
  ].join('\n  ');
}

// Strip the shell's own title/og/twitter/canonical tags so we don't emit two
// of each. Scrapers vary on which duplicate wins; leaving both is the bug.
function stripShellMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
}

function readShell() {
  // includeFiles in vercel.json puts public/app.html in the lambda bundle.
  const candidates = [
    path.join(process.cwd(), 'public', 'app.html'),
    path.join(import.meta.dirname || '.', '..', 'public', 'app.html'),
  ];
  for (const c of candidates) {
    try {
      return fs.readFileSync(c, 'utf-8');
    } catch (_) { /* try next */ }
  }
  return null;
}

async function fetchProfile(handle) {
  const url =
    `${SUPABASE_URL}/rest/v1/public_profiles` +
    `?handle=eq.${encodeURIComponent(handle)}` +
    `&select=handle,display_name,skills,total_solves,streak,xp,archetype_name,archetype_emoji`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  const shell = readShell();
  if (!shell) {
    // Never 500 a page a human might be looking at. Bounce to the app.
    res.setHeader('Location', '/app/');
    return res.status(302).end();
  }

  const raw = (req.query && req.query.handle) || '';
  const handle = String(raw).trim().toLowerCase().replace(/\/+$/, '');

  const serve = (html, sMaxAge) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Scrapers re-fetch often; give the edge something to hand back. The
    // profile itself republishes on a 15s debounce, so a 5-minute edge cache
    // with a long stale window is well inside "fresh enough".
    res.setHeader('Cache-Control', `public, s-maxage=${sMaxAge}, stale-while-revalidate=86400`);
    return res.status(200).send(html);
  };

  if (!HANDLE_RE.test(handle)) return serve(shell, 300);

  let profile = null;
  try {
    profile = await fetchProfile(handle);
  } catch (_) {
    // Supabase down / slow: the app still boots and reads the profile
    // itself. Generic card beats a broken page.
    return serve(shell, 60);
  }

  if (!profile) return serve(shell, 60);

  const html = stripShellMeta(shell).replace(
    /<\/head>/i,
    `  ${metaBlock(profile, handle)}\n</head>`
  );
  return serve(html, 300);
}

// Exported for tests — these are the parts worth pinning down.
export const _internals = { escapeHtml, topSkills, buildDescription, metaBlock, stripShellMeta, HANDLE_RE };
