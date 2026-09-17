// prep-plan-note — the note's numbers, from the same plan the app draws.
//
// Pure: userData + a clock in, the note's content out. No Supabase, no
// Resend, no env. It exists as its own module so it can be run locally
// (`deno run` a harness against a fake record) without starting the server
// in index.ts.
//
// THE RULE THIS FILE KEEPS: it never re-implements the plan. The three items
// come from `planToDate` in src/utils/interview-prep.js — the function the
// Interview Prep card calls — over the live bank. If the card and the email
// ever disagree about what today holds, the bug is in the inputs assembled
// here, not in a second planner. The days-to-date number is `daysUntil` from
// the same module, in its UTC calendar-day frame.
//
// Imports reach into src/ by relative path. The Supabase bundler walks the
// import graph from the entrypoint, so the utils and the data modules ship
// with the function; nothing is copied.

import './globals.ts'
import '../../../src/data/challenges.js'
import '../../../src/data/sector-challenges.js'     // appends 275-284, 300-311
import '../../../src/data/challenge-companies.js'
import '../../../src/data/mock-interviews.js'

import {
  companyReadiness,
  daysUntil,
  findTarget,
  planToDate,
  targetDemandedSkills,
} from '../../../src/utils/interview-prep.js'
import { CANONICAL_SKILLS } from '../../../src/utils/skill-calc.js'
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../../../src/data/roadmap-stages.js'

const W = globalThis as any
export const BANK: any[] = W.challengesData || []
export const COMPANY_MAP: Record<string, string[]> = W.challengeCompanies || {}
export const MOCKS: any[] = W.mockInterviewsData || []

/** A date further out than this is not "the next few days"; the note waits. */
export const MAX_DAYS_OUT = 45
/** How many items the note carries. */
export const ITEMS_PER_NOTE = 3

export type NoteItem = {
  kind: 'target' | 'drill' | 'mock'
  title: string
  skill: string | null
  difficulty: string | null
  challengeId: number | null
  interviewId: string | null
  pro: boolean
  path: string
}

export type PrepNote = {
  company: string | null
  /** true when the company is a signed archetype member; the mock is then real */
  archetype: boolean
  daysOut: number
  status: string
  items: NoteItem[]
  proItems: number
  weakest: string | null
  /** true when one of the items is a drill on the weakest skill */
  weakestInItems: boolean
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** The person's canonical skill levels: the radar's own record first, the
 *  derived mastery rows second. Only the nine canonical names are read. */
export function skillLevelsOf(userData: any): Record<string, number> {
  const out: Record<string, number> = {}
  const radar = userData?.weaknessTracking?.skillLevels
  const mastery = userData?.skillMastery
  for (const name of CANONICAL_SKILLS as string[]) {
    const r = radar && typeof radar === 'object' ? radar[name] : undefined
    if (isNum(r)) { out[name] = r; continue }
    const m = mastery && typeof mastery === 'object' ? mastery[name]?.mastery : undefined
    if (isNum(m)) out[name] = m
  }
  return out
}

/** Lowest of the nine the record holds a number for; null with no data. */
export function weakestSkillOf(levels: Record<string, number>): string | null {
  let best: { name: string; level: number } | null = null
  for (const name of CANONICAL_SKILLS as string[]) {
    const level = levels[name]
    if (!isNum(level)) continue
    if (!best || level < best.level || (level === best.level && name < best.name)) best = { name, level }
  }
  return best ? best.name : null
}

/** Pro status that is actually in force: the flag, and an expiry not passed. */
export function isProNow(userData: any, now: number): boolean {
  if (userData?.proStatus !== true) return false
  const exp = userData?.proExpiry
  if (exp === undefined || exp === null || exp === '') return true
  const t = isNum(exp) ? exp : Date.parse(String(exp))
  return Number.isFinite(t) ? t > now : true
}

/** The challenge ids tagged with this company, for a company with no
 *  archetype (interview-first point 2: a plan for every company). */
function taggedIdsFor(company: string): number[] {
  const wanted = company.trim().toLowerCase()
  const ids: number[] = []
  const seen = new Set<number>()
  for (const ch of BANK) {
    if (!ch || !isNum(ch.id) || seen.has(ch.id)) continue
    seen.add(ch.id)
    const tags = COMPANY_MAP[String(ch.id)]
    if (!Array.isArray(tags)) continue
    if (tags.some(t => typeof t === 'string' && t.trim().toLowerCase() === wanted)) ids.push(ch.id)
  }
  return ids.sort((a, b) => a - b)
}

/** The item's page in the app, without utm (index.ts adds it). */
const pathFor = (kind: string, challengeId: number | null, interviewId: string | null) =>
  kind === 'mock' && interviewId
    ? `/app/?src=prep_note&interview=${encodeURIComponent(interviewId)}`
    : `/app/?src=prep_note&challenge=${challengeId}`

// The app's own lock rule (isContentLocked in src/app.jsx): a Hard challenge
// without the freePreview flag, and a mock without isFree. Solved is never
// locked, but a solved item is never in the plan either.
const challengeLocked = (c: any) => !!c && c.difficulty === 'Hard' && c.freePreview !== true
const mockLocked = (m: any) => !m || m.isFree !== true

/**
 * Everything the email says about this person, or null when there is nothing
 * to say: no date, a date passed or too far out, or a plan with no items.
 */
export function buildPrepNote(userData: any, now: number): PrepNote | null {
  const date = userData?.prepTarget?.date
  const daysOut = daysUntil(date, now)
  if (daysOut === null || daysOut < 1 || daysOut > MAX_DAYS_OUT) return null

  const rawCompany = userData?.prepTarget?.company
  const company = typeof rawCompany === 'string' && rawCompany.trim() ? rawCompany.trim() : null
  const solvedIds: number[] = Array.isArray(userData?.solvedChallenges) ? userData.solvedChallenges : []
  const levels = skillLevelsOf(userData)

  // The target: a signed archetype when there is one, else the company's
  // tagged set with no mock, else nothing but the person's own gaps.
  const signed = company ? findTarget(company, BANK, COMPANY_MAP, MOCKS) : null
  const target = signed
    ? signed
    : { company, mockId: null, challengeIds: company ? taggedIdsFor(company) : [] }

  // The best sitting at the target's mock, if any (same read as the card).
  const history: any[] = Array.isArray(userData?.interviewHistory) ? userData.interviewHistory : []
  const sittings = signed ? history.filter(h => h && h.interviewId === signed.mockId) : []
  const mockResult = sittings.length > 0
    ? { taken: true, scorePercent: sittings.reduce((b, h) => Math.max(b, h.percentage ?? h.scorePercent ?? 0), 0) }
    : null

  // Readiness feeds the drills their levels. companyReadiness returns null
  // under five solves or off-archetype; then the demanded skills (or, with
  // no target set at all, the nine canonical) carry the person's levels
  // directly, so the drills still land on THEIR weakest rather than on a
  // tie of zeros.
  const readiness = signed
    ? companyReadiness({ skillLevels: levels, solvedIds, target, bank: BANK, mockResult })
    : null
  // With no target set the drills come from the nine canonical skills — but
  // only the ones the record holds a number for: a skill with no data is
  // unknown, not weak, and would otherwise outrank a real 20. A record with
  // no numbers at all falls to all nine at 0.
  const known = (CANONICAL_SKILLS as string[]).filter(s => isNum(levels[s]))
  const demandedBase = target.challengeIds.length > 0
    ? targetDemandedSkills(target, BANK)
    : (known.length > 0 ? known : (CANONICAL_SKILLS as string[])).map(skill => ({ skill, challenges: 0, share: 0 }))
  const readinessForPlan = readiness ?? {
    parts: {
      skills: { demanded: demandedBase.map(d => ({ ...d, level: isNum(levels[d.skill]) ? levels[d.skill] : 0 })) },
      mock: { taken: mockResult?.taken === true },
    },
  }

  // curriculumOrder: the SAME map the app's card sorts by — the stages moved
  // to src/data/roadmap-stages.js on 2026-09-17 so this could import them.
  // With an empty map the comparator fell to difficulty then id, which for a
  // Snowflake plan could hand out challenge 1, the 24% opener.
  const plan = planToDate({
    target,
    readiness: readinessForPlan,
    solvedIds,
    bank: BANK,
    daysRemaining: daysOut,
    now,
    curriculumOrder: SQL_ROADMAP_CHALLENGE_ORDER,
  })

  // Today's items first, topped up from the following days when today holds
  // fewer than three — the first three items of the plan, in the plan's order.
  // One exception: when TODAY holds the mock (planToDate puts the dress
  // rehearsal last on the last planned day, which on a one-day plan is
  // today), it takes the third slot rather than falling off the note.
  const ordered: any[] = []
  for (const day of (Array.isArray(plan?.days) ? plan.days : [])) {
    for (const it of (Array.isArray(day?.items) ? day.items : [])) ordered.push(it)
    if (ordered.length >= ITEMS_PER_NOTE) break
  }
  const todayItems: any[] = Array.isArray(plan?.today) ? plan.today : []
  const todayMock = todayItems.find(it => it && it.kind === 'mock')
  const chosen = ordered.slice(0, ITEMS_PER_NOTE)
  if (todayMock && !chosen.includes(todayMock)) {
    chosen.splice(Math.min(ITEMS_PER_NOTE, chosen.length) - 1, 1, todayMock)
  }
  const pro = isProNow(userData, now)
  const byId = new Map<number, any>()
  for (const c of BANK) if (c && isNum(c.id) && !byId.has(c.id)) byId.set(c.id, c)

  const items: NoteItem[] = []
  for (const it of chosen) {
    if (it.kind === 'mock') {
      const mock = MOCKS.find(m => m && m.id === it.interviewId)
      items.push({
        kind: 'mock',
        title: (mock && (mock.title || mock.company)) ? `${mock.title}` : 'Timed mock',
        skill: null,
        difficulty: null,
        challengeId: null,
        interviewId: it.interviewId,
        pro: !pro && mockLocked(mock),
        path: pathFor('mock', null, it.interviewId),
      })
      continue
    }
    const c = byId.get(it.challengeId)
    if (!c) continue
    items.push({
      kind: it.kind === 'drill' ? 'drill' : 'target',
      title: it.title || c.title || `Challenge ${c.id}`,
      skill: it.skill || null,
      difficulty: it.difficulty || c.difficulty || null,
      challengeId: c.id,
      interviewId: null,
      pro: !pro && challengeLocked(c),
      path: pathFor('challenge', c.id, null),
    })
  }
  if (items.length === 0) return null

  return {
    company,
    archetype: !!signed,
    daysOut,
    status: String(plan?.status || ''),
    items,
    proItems: items.filter(i => i.pro).length,
    weakest: weakestSkillOf(levels),
    weakestInItems: items.some(i => i.skill !== null && i.skill === weakestSkillOf(levels)),
  }
}
