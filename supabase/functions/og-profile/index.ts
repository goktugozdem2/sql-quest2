// Supabase Edge Function: og-profile
// Deploy: supabase functions deploy og-profile
//
// GET /functions/v1/og-profile?handle=elena
//   → 1200×630 SVG radar card for the handle, suitable for OG image URLs.
//   → Cache-Control tuned for social scrapers (1 day edge, 1 week stale).
//
// Returns image/svg+xml. Most social platforms accept SVG in og:image
// these days (Twitter, LinkedIn, Discord). Slack converts to PNG server-
// side. If you hit a platform that rejects SVG, wire in a resvg-wasm PNG
// converter; this file is deliberately dependency-light to start.
//
// Depends on the public_profiles table (see publish-profile/index.ts).
// Reads via anon SELECT (RLS allows it).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Must match src/components/SkillRadar.jsx DEFAULT_SKILLS + DEFAULT_META.
// Kept inline because edge functions can't import src files. Update in
// lockstep with the client taxonomy.
const DEFAULT_SKILLS = [
  'Querying Basics',
  'Aggregation & Grouping',
  'Joins',
  'Subqueries & CTEs',
  'Conditional Logic',
  'Window Functions',
  'String Functions',
  'Date Functions',
  'NULL Handling',
]

const DEFAULT_META: Record<string, { short: string }> = {
  'Querying Basics':        { short: 'QUERY' },
  'Aggregation & Grouping': { short: 'AGG' },
  'Joins':                  { short: 'JOIN' },
  'Subqueries & CTEs':      { short: 'SUBQ' },
  'Conditional Logic':      { short: 'CASE' },
  'Window Functions':       { short: 'WINDOW' },
  'String Functions':       { short: 'STRING' },
  'Date Functions':         { short: 'DATE' },
  'NULL Handling':          { short: 'NULL' },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const handle = (url.searchParams.get('handle') || '').trim().toLowerCase()
  if (!handle) {
    return svgError('Missing handle', 400)
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  )
  const { data, error } = await supa
    .from('public_profiles')
    .select('handle, display_name, skills, total_solves, streak, archetype_name, archetype_emoji')
    .eq('handle', handle)
    .maybeSingle()

  if (error) {
    return svgError('Lookup failed', 500)
  }

  if (!data) {
    return svgCard(notFoundSvg(handle), 200)
  }

  const skills = isPlainObject(data.skills) ? data.skills as Record<string, number> : {}
  const archetype = {
    name: data.archetype_name || deriveArchetypeName(skills),
    emoji: data.archetype_emoji || deriveArchetypeEmoji(skills),
  }
  const overall = computeOverall(skills)
  const svg = buildShareSvg({
    skills,
    handle: data.display_name || handle,
    overall,
    archetype,
  })
  return svgCard(svg, 200)
})

function svgCard(svg: string, status: number) {
  return new Response(svg, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

function svgError(msg: string, status: number) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#1a1a2e" />
  <text x="600" y="320" text-anchor="middle" fill="#ef4444" font-size="28" font-family="system-ui,sans-serif">${escapeXml(msg)}</text>
</svg>`
  return new Response(svg, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml; charset=utf-8' },
  })
}

function notFoundSvg(handle: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e" />
      <stop offset="100%" stop-color="#2d1b4e" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="600" y="250" text-anchor="middle" fill="#FFE34D" font-size="22" font-weight="700" font-family="system-ui,sans-serif" letter-spacing="3">SQL QUEST</text>
  <text x="600" y="330" text-anchor="middle" fill="#ffffff" font-size="56" font-weight="900" font-family="system-ui,sans-serif">@${escapeXml(handle)}</text>
  <text x="600" y="390" text-anchor="middle" fill="#9ca3af" font-size="26" font-family="system-ui,sans-serif">Hasn't claimed their SQL shape yet.</text>
  <text x="600" y="510" text-anchor="middle" fill="#a855f7" font-size="26" font-weight="700" font-family="system-ui,sans-serif">Claim yours at sqlquest.io</text>
</svg>`
}

// ── Build the radar share card (mirror of src/utils/radar-export.js) ────
function buildShareSvg({ skills, handle, overall, archetype }: {
  skills: Record<string, number>,
  handle: string,
  overall: number,
  archetype: { name: string; emoji: string },
}) {
  const width = 1200, height = 630
  const radarCx = 280, radarCy = height / 2
  const maxR = 220 - 60

  const topics = DEFAULT_SKILLS
  const n = topics.length
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (v / 100) * maxR
    return { x: radarCx + r * Math.cos(a), y: radarCy + r * Math.sin(a) }
  }
  const lbl = (i: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = maxR + 28
    return { x: radarCx + r * Math.cos(a), y: radarCy + r * Math.sin(a) }
  }

  const poly = topics.map((t, i) => {
    const p = pt(i, Number(skills[t] || 0))
    return `${p.x},${p.y}`
  }).join(' ')

  const gridLevels = [25, 50, 75, 100]
  const gridPolys = gridLevels.map(lv => {
    const pts = topics.map((_, i) => {
      const p = pt(i, lv)
      return `${p.x},${p.y}`
    }).join(' ')
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />`
  }).join('')

  const axes = topics.map((_, i) => {
    const p = pt(i, 100)
    return `<line x1="${radarCx}" y1="${radarCy}" x2="${p.x}" y2="${p.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`
  }).join('')

  const labels = topics.map((topic, i) => {
    const v = Number(skills[topic] || 0)
    const p = pt(i, v)
    const l = lbl(i)
    const color = v >= 70 ? '#22c55e' : v >= 40 ? '#eab308' : v > 0 ? '#ef4444' : '#4b5563'
    const anch = l.x < radarCx - 15 ? 'end' : l.x > radarCx + 15 ? 'start' : 'middle'
    const meta = DEFAULT_META[topic] || { short: topic.slice(0, 8).toUpperCase() }
    return `
      <circle cx="${p.x}" cy="${p.y}" r="${v > 0 ? 5 : 3}" fill="${color}" stroke="white" stroke-width="1.5" />
      <text x="${l.x}" y="${l.y - 4}" text-anchor="${anch}" fill="#9ca3af" font-size="14" font-weight="600" font-family="system-ui,sans-serif">${meta.short}</text>
      <text x="${l.x}" y="${l.y + 14}" text-anchor="${anch}" fill="${color}" font-size="15" font-weight="700" font-family="system-ui,sans-serif">${v > 0 ? v + '%' : '—'}</text>
    `
  }).join('')

  const textX = 640

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e" />
      <stop offset="50%" stop-color="#2d1b4e" />
      <stop offset="100%" stop-color="#1a1a2e" />
    </linearGradient>
    <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(147,51,234,0.45)" />
      <stop offset="100%" stop-color="rgba(236,72,153,0.45)" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)" />

  ${gridPolys}
  ${axes}
  <polygon points="${poly}" fill="url(#radarFill)" stroke="rgba(168,85,247,0.9)" stroke-width="3" filter="url(#glow)" />
  ${labels}

  <text x="${textX}" y="170" fill="#FFE34D" font-size="20" font-weight="700" font-family="system-ui,sans-serif" letter-spacing="2">SQL QUEST</text>
  <text x="${textX}" y="260" fill="#ffffff" font-size="72" font-weight="900" font-family="system-ui,sans-serif">${escapeXml(archetype.emoji)} ${escapeXml(archetype.name)}</text>
  <text x="${textX}" y="320" fill="#d1d5db" font-size="26" font-family="system-ui,sans-serif">@${escapeXml(handle)}</text>

  <rect x="${textX}" y="380" width="240" height="90" rx="12" fill="rgba(255,227,77,0.12)" stroke="#FFE34D" stroke-width="2" />
  <text x="${textX + 20}" y="415" fill="#FFE34D" font-size="14" font-weight="600" font-family="system-ui,sans-serif" letter-spacing="1">OVERALL</text>
  <text x="${textX + 20}" y="458" fill="#ffffff" font-size="42" font-weight="900" font-family="system-ui,sans-serif">${overall}<tspan font-size="24" fill="#9ca3af">/100</tspan></text>

  <text x="${textX}" y="595" fill="#a855f7" font-size="22" font-weight="700" font-family="system-ui,sans-serif">sqlquest.io</text>
</svg>`
}

function computeOverall(skills: Record<string, number>): number {
  const vals = Object.values(skills).filter(v => typeof v === 'number') as number[]
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
}

function deriveArchetypeName(skills: Record<string, number>): string {
  const g = (k: string) => Number(skills[k] || 0)
  const vals = Object.values(skills).filter(v => typeof v === 'number') as number[]
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  if (g('Window Functions') >= 70) return 'The Window Wizard'
  if (g('Joins') >= 70 && g('Subqueries & CTEs') >= 60) return 'The Join Master'
  if (g('Aggregation & Grouping') >= 70) return 'The Aggregation Ace'
  if (g('Conditional Logic') >= 70 && g('Subqueries & CTEs') >= 60) return 'The Logic Surgeon'
  if (g('NULL Handling') >= 70) return 'The NULL Whisperer'
  if (g('Date Functions') >= 70 || g('String Functions') >= 70) return 'The Data Wrangler'
  if (avg >= 65) return 'The Full-Stack Analyst'
  if (avg >= 50) return 'The Journey-Person'
  if (avg >= 30) return 'The Apprentice'
  return 'The Explorer'
}
function deriveArchetypeEmoji(skills: Record<string, number>): string {
  const name = deriveArchetypeName(skills)
  const emojis: Record<string, string> = {
    'The Window Wizard': '🪟',
    'The Join Master': '🔗',
    'The Aggregation Ace': '📊',
    'The Logic Surgeon': '🔀',
    'The NULL Whisperer': '⁇',
    'The Data Wrangler': '✂️',
    'The Full-Stack Analyst': '🎯',
    'The Journey-Person': '🚶',
    'The Apprentice': '📚',
    'The Explorer': '🧭',
  }
  return emojis[name] || '🧭'
}

function escapeXml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isPlainObject(x: unknown): boolean {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}
