// activated-note — the letter, per recipient (2026-11-25).
//
// Pure: a recipient in, { subject, html, text } out. No Supabase, no Resend,
// no Deno globals — index.ts (Deno) and tests/activated-note-template.test.js
// (vitest) import the same module.
//
// The layout and the fixed sentences are a React Email template
// (emails/activated-note.tsx), rendered at BUILD time into
// ./template.generated.ts. This file chooses the per-recipient sentences and
// fills the template's {{slots}}. The voice rule (CLAUDE.md, "Email voice"):
// the founder in every subject; a short list, written by hand, said in the
// body; never byte-identical bodies — the name, the solve count, the opener,
// the weakest skill and the company make each letter its own.

import { ACTIVATED_NOTE_HTML, ACTIVATED_NOTE_SLOTS, ACTIVATED_NOTE_TEXT } from './template.generated.ts'

// The nine canonical skills (src/utils/skill-calc.js). A record written by
// the app since 2026-09-12 carries these names; older records are ignored.
export const CANONICAL = [
  'Querying Basics', 'Aggregation & Grouping', 'Joins', 'Subqueries & CTEs',
  'Conditional Logic', 'Window Functions', 'String Functions', 'Date Functions', 'NULL Handling',
]
// The person's lowest practised skill, under 70 — or null.
//
// Two sources, in this order. `skillMastery` is the canonical user_skill
// record, but it is rebuilt in the BROWSER (src/utils/user-skill.js, from
// 2026-09-12): an account that has not opened the app since then still
// carries the old fourteen-name record, whose rows have no numeric
// `mastery`. That is most of this email's audience — lapsed non-payers —
// and on 2026-10-01 a dry run showed `weakest: null` for all forty, people
// with 105 and 114 solves among them. So the second source is the Skillmap
// itself, `weaknessTracking.skillLevels`, which is canonical and numeric on
// every one of those rows. A skill at 0 was never practised and is not "the
// lowest line on your Skillmap"; it is left out of both.
export function weakestSkill(userData: any): string | null {
  const lowest = (read: (name: string) => unknown): string | null => {
    let best: { name: string; value: number } | null = null
    for (const name of CANONICAL) {
      const v = read(name)
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue
      if (!best || v < best.value) best = { name, value: v }
    }
    return best && best.value < 70 ? best.name : null
  }
  const m = userData?.skillMastery
  const hasMastery = m && typeof m === 'object' && CANONICAL.some(n => typeof m[n]?.mastery === 'number')
  if (hasMastery) return lowest(n => m[n]?.mastery)
  const levels = userData?.weaknessTracking?.skillLevels
  if (levels && typeof levels === 'object') return lowest(n => levels[n])
  return null
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Three subject lines, chosen by username so a batch never reads as one
// mailing and the same person always gets the same one (idempotent dry runs).
export const SUBJECTS = [
  (n: number) => `From SQL Quest's founder — after your ${ordinal(n)} solve`,
  (n: number) => `SQL Quest's founder here — ${n} solves in, one question`,
  (n: number) => `I build SQL Quest — the part after ${n} solves`,
]
export const pick = (username: string, len: number) => {
  let h = 0
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % len
}

export type Recipient = { username: string; solves: number; weakest: string | null; company: string | null }

// A sentence is plain text with at most a few emphasised parts; the HTML
// gets <strong>, the plain text gets the words alone.
type Part = string | { strong: string }

export function sentences(r: Recipient): Record<'opener' | 'skillLine' | 'targetLine', Part[]> {
  const { username, solves, weakest, company } = r
  // Three openers, chosen by username; the middle one only reads right
  // once someone is clearly past six, so under nine solves it is not offered.
  const openers = [
    `You have ${solves} solves on SQL Quest. That is the point where most people stop, so this one is from me, not from a sequence.`,
    `${solves} solves. Most people who start never reach six, and you are well past it — so I am writing this myself.`,
    `I looked at the accounts that got past six solves and never bought, and yours is one of a short list, so I am writing to you directly.`,
  ]
  const eligible = solves >= 9 ? openers : [openers[0], openers[2]]
  const opener = eligible[pick(username, eligible.length)]
  const skillLine: Part[] = weakest
    ? [`Your Skillmap's lowest line right now is `, { strong: weakest }, `. That is the shape the screens save for last, and it is where the Hard set starts.`]
    : [`The Hard set is where the screens' last question lives: a window function over a ledger, a NULL nobody handled, a correlated subquery.`]
  const targetLine: Part[] = company
    ? [`You named `, { strong: company }, `. Its set and, where candidates have reported the format, its timed mock are in Pro.`]
    : [`If there is a company on your calendar, its set is there — Revolut and Capital One also have a timed mock built to the reported screen.`]
  return { opener: [opener], skillLine, targetLine }
}

export const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const asHtml = (parts: Part[]) => parts.map(p => typeof p === 'string' ? escapeHtml(p) : `<strong>${escapeHtml(p.strong)}</strong>`).join('')
const asText = (parts: Part[]) => parts.map(p => typeof p === 'string' ? p : p.strong).join('')

// Fill every {{slot}} in one pass. Refuses, before filling, a value set that
// misses a declared slot or a template holding a slot nobody declared — so a
// letter never goes out with a {{…}} in it. (The check is on the template,
// not the output: a username that happens to contain braces is not a slot.)
// `values` are already in the target format (escaped for HTML, raw for text).
export function fillTemplate(template: string, values: Record<string, string>): string {
  for (const slot of ACTIVATED_NOTE_SLOTS) {
    if (typeof values[slot] !== 'string') throw new Error(`activated-note: no value for {{${slot}}}`)
  }
  for (const [, slot] of template.matchAll(/\{\{(\w+)\}\}/g)) {
    if (typeof values[slot] !== 'string') throw new Error(`activated-note: template slot {{${slot}}} has no value`)
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_m, slot) => values[slot])
}

export function renderActivatedNote(r: Recipient, urls: { cta: string; unsub: string }) {
  const subject = SUBJECTS[pick(r.username, SUBJECTS.length)](r.solves)
  const s = sentences(r)
  const preview = `${r.solves} solves in. One question from the person who builds SQL Quest.`
  const html = fillTemplate(ACTIVATED_NOTE_HTML, {
    preview: escapeHtml(preview),
    name: escapeHtml(r.username),
    opener: asHtml(s.opener),
    skillLine: asHtml(s.skillLine),
    targetLine: asHtml(s.targetLine),
    ctaUrl: escapeHtml(urls.cta),
    unsubUrl: escapeHtml(urls.unsub),
  })
  const text = fillTemplate(ACTIVATED_NOTE_TEXT, {
    preview,
    name: r.username,
    opener: asText(s.opener),
    skillLine: asText(s.skillLine),
    targetLine: asText(s.targetLine),
    ctaUrl: urls.cta,
    unsubUrl: urls.unsub,
  })
  return { subject, html, text }
}
