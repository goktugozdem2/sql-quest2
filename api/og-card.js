// PNG share card for /u/:handle — the image social platforms actually render.
//
// WHY THIS REPLACES THE SVG ENDPOINT
// ----------------------------------
// supabase/functions/og-profile returns image/svg+xml and its header comment
// claims "most social platforms accept SVG in og:image these days (Twitter,
// LinkedIn, Discord)". That is not true, and it was the whole ballgame: SVG
// is silently rejected by every major card renderer. The card generator was
// correct, deployed, and produced an image that unfurled precisely nowhere.
//
// So: same radar, same numbers, rasterised to PNG via satori/resvg.
//
// SPLIT OF RESPONSIBILITIES (deliberate)
//   - The radar is an inline SVG data URI containing GEOMETRY ONLY — rings,
//     axes, the data polygon. No <text>, so it needs no font to rasterise.
//   - Every glyph is drawn by satori using the vendored Geist files, so text
//     rendering never depends on a network fetch at request time.
//
// Palette is DESIGN.md's dark palette. The old SVG card used #1a1a2e/#2d1b4e
// and #a855f7, none of which are in the palette; this one doesn't.
// Accent #FFE34D appears only on the XP and streak values, which is exactly
// the list DESIGN.md permits ("score/XP values ... streak indicators").
import fs from 'fs';
import path from 'path';
import { ImageResponse } from '@vercel/og';

const SUPABASE_URL = 'https://abmgtjafghpupaqsjnwe.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

const HANDLE_RE = /^[a-z0-9_-]{1,40}$/;

// DESIGN.md dark palette.
const C = {
  bg: '#0E0F13',
  surface: '#16181F',
  border: '#2A2E38',
  text: '#F2F0EA',
  muted: '#8A8E99',
  accent: '#FFE34D',
  data: '#7CC4FF', // --sql-keyword; brand palette, and not the accent.
};

// Must stay in lockstep with CANONICAL_SKILLS in src/utils/skill-calc.js.
const SKILLS = [
  'Querying Basics',
  'Aggregation & Grouping',
  'Joins',
  'Subqueries & CTEs',
  'Conditional Logic',
  'Window Functions',
  'String Functions',
  'Date Functions',
  'NULL Handling',
];

let FONTS = null;
function fonts() {
  if (FONTS) return FONTS;
  const read = (f) => {
    for (const base of [path.join(process.cwd(), 'assets', 'fonts'), path.join(import.meta.dirname || '.', '..', 'assets', 'fonts')]) {
      try { return fs.readFileSync(path.join(base, f)); } catch (_) { /* next */ }
    }
    throw new Error(`font missing: ${f}`);
  };
  FONTS = [
    { name: 'Geist', data: read('Geist-400.ttf'), weight: 400, style: 'normal' },
    { name: 'Geist', data: read('Geist-700.ttf'), weight: 700, style: 'normal' },
  ];
  return FONTS;
}

// Geometry-only radar. Rendered at SIZE×SIZE and dropped in as an <img>.
function radarSvg(skills, size) {
  const cx = size / 2, cy = size / 2, maxR = size / 2 - 34;
  const n = SKILLS.length;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, v)) / 100) * maxR;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const ring = (lv) =>
    SKILLS.map((_, i) => pt(i, lv).map((v) => v.toFixed(1)).join(',')).join(' ');

  const rings = [25, 50, 75, 100]
    .map((lv) => `<polygon points="${ring(lv)}" fill="none" stroke="${C.border}" stroke-width="1.5"/>`)
    .join('');
  const axes = SKILLS.map((_, i) => {
    const [x, y] = pt(i, 100);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.border}" stroke-width="1"/>`;
  }).join('');
  const data = SKILLS.map((s, i) => pt(i, Number(skills?.[s] || 0)).map((v) => v.toFixed(1)).join(',')).join(' ');
  const dots = SKILLS.map((s, i) => {
    const [x, y] = pt(i, Number(skills?.[s] || 0));
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${C.data}"/>`;
  }).join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    rings + axes +
    `<polygon points="${data}" fill="${C.data}" fill-opacity="0.22" stroke="${C.data}" stroke-width="3"/>` +
    dots +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const div = (style, children) => ({ type: 'div', props: { style, children } });
const txt = (style, s) => ({ type: 'div', props: { style, children: String(s) } });

function statBlock(label, value, accent) {
  return div({ display: 'flex', flexDirection: 'column', marginRight: 46 }, [
    txt({ fontSize: 44, fontWeight: 700, color: accent ? C.accent : C.text, lineHeight: 1.1 }, value),
    txt({ fontSize: 17, color: C.muted, marginTop: 4 }, label),
  ]);
}

function topSkills(skills, n) {
  if (!skills || typeof skills !== 'object') return [];
  return Object.entries(skills)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function card(p, handle) {
  const name = p?.display_name || handle;
  const strong = topSkills(p?.skills, 2);

  return div(
    {
      display: 'flex',
      width: '100%',
      height: '100%',
      background: C.bg,
      fontFamily: 'Geist',
      padding: 56,
      alignItems: 'center',
    },
    [
      // Radar panel
      div(
        {
          display: 'flex',
          width: 440,
          height: 440,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        [{ type: 'img', props: { src: radarSvg(p?.skills, 380), width: 380, height: 380 } }]
      ),

      // Text column
      div({ display: 'flex', flexDirection: 'column', marginLeft: 56, flexGrow: 1 }, [
        txt({ fontSize: 19, fontWeight: 700, color: C.muted, letterSpacing: 4 }, 'SQL QUEST'),
        txt({ fontSize: 66, fontWeight: 700, color: C.text, marginTop: 10, lineHeight: 1.05 }, `@${name}`),
        p?.archetype_name
          ? txt({ fontSize: 30, color: C.muted, marginTop: 8 }, p.archetype_name)
          : txt({ fontSize: 30, color: C.muted, marginTop: 8 }, 'SQL skill profile'),
        div({ display: 'flex', marginTop: 36 }, [
          statBlock('solved', p?.total_solves || 0, false),
          // Accent is a positive signal, so a dead streak doesn't get to wear
          // it — "0" in arcade yellow reads as a highlight of nothing.
          statBlock('day streak', p?.streak || 0, Number(p?.streak) > 0),
          statBlock('XP', p?.xp || 0, Number(p?.xp) > 0),
        ]),
        strong.length
          ? txt({ fontSize: 21, color: C.muted, marginTop: 30 }, `Strongest: ${strong.join(' · ')}`)
          : txt({ fontSize: 21, color: C.muted, marginTop: 30 }, 'sqlquest.app'),
      ]),
    ]
  );
}

// Unclaimed handles get a card too — it's an invitation, not an error.
function unclaimedCard(handle) {
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: C.bg,
      fontFamily: 'Geist',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 64,
    },
    [
      txt({ fontSize: 19, fontWeight: 700, color: C.muted, letterSpacing: 4 }, 'SQL QUEST'),
      txt({ fontSize: 64, fontWeight: 700, color: C.text, marginTop: 18 }, `@${handle}`),
      txt({ fontSize: 28, color: C.muted, marginTop: 14 }, "hasn't claimed their SQL shape yet"),
      txt({ fontSize: 24, fontWeight: 700, color: C.accent, marginTop: 40 }, 'sqlquest.app'),
    ]
  );
}

async function fetchProfile(handle) {
  const url =
    `${SUPABASE_URL}/rest/v1/public_profiles?handle=eq.${encodeURIComponent(handle)}` +
    `&select=handle,display_name,skills,total_solves,streak,xp,archetype_name`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export async function renderCard(handle) {
  const h = String(handle || '').trim().toLowerCase();
  const profile = HANDLE_RE.test(h) ? await fetchProfile(h).catch(() => null) : null;
  const el = profile ? card(profile, h) : unclaimedCard(HANDLE_RE.test(h) ? h : 'sqlquest');
  const img = new ImageResponse(el, { width: 1200, height: 630, fonts: fonts() });
  return Buffer.from(await img.arrayBuffer());
}

export default async function handler(req, res) {
  try {
    const buf = await renderCard((req.query && req.query.handle) || '');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).send(buf);
  } catch (e) {
    console.error('og-card failed', e);
    // A broken image is worse than the generic one: fall back to the static
    // site card so the unfurl still shows something.
    res.setHeader('Location', 'https://sqlquest.app/og-image.png');
    return res.status(302).end();
  }
}

export const _internals = { radarSvg, topSkills, HANDLE_RE, SKILLS };
