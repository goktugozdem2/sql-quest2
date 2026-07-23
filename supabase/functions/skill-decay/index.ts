// Supabase Edge Function: skill-decay
// Deploy: supabase functions deploy skill-decay
// Schedule: Run daily via Supabase cron (pg_cron) or external scheduler
//
// This sends skill-decay re-engagement emails to users who:
// 1. Have XP >= 100 (invested users who are worth re-engaging)
// 2. Haven't been active in 5+ days
// 3. Have skills that are decaying (not practiced in 7+ days)
// 4. Have an email on file
//
// Uses the same data shape as getSkillEmailContext() in the frontend.
//
// Setup:
// 1. Set RESEND_API_KEY in Supabase secrets
// 2. Deploy this function
// 3. Schedule it to run daily (e.g., 10am UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Internal accounts (test2 with 84 solves, sqlquest, test109 and friends)
// carry real addresses and pass every audience filter — they land in
// email_events and inflate the send counts and 48h-return rates these
// campaigns are judged by. (inlined; keep in sync across email functions —
// canonical copy lives in lapsed-pro)
const isInternalAccount = (username: string, email?: string | null) =>
  /^(test|demo|admin|qa)\d*$/i.test(username || '') ||
  (username || '').toLowerCase() === 'sqlquest' ||
  (email || '').toLowerCase().endsWith('@datrick.com')


// ── shared email plumbing (inlined; keep in sync across email functions) ──
const SITE = 'https://sqlquest.app'
const FROM = 'SQL Quest <noreply@sqlquest.app>'

const utm = (path: string, camp: string) =>
  `${SITE}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_campaign=${camp}`

async function ensureUnsubToken(supabase: any, username: string, userData: any): Promise<string> {
  if (userData.unsubToken) return userData.unsubToken
  userData.unsubToken = crypto.randomUUID()
  await supabase.from('users').update({ data: userData }).eq('username', username)
  return userData.unsubToken
}

const unsubLink = (token: string) =>
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-unsubscribe?ut=${token}`

const footer = (unsub: string) => `
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px;line-height:1.7;">
    SQL Quest — Master SQL through practice · <a href="${SITE}" style="color:#9ca3af;">sqlquest.app</a><br>
    <a href="${unsub}" style="color:#9ca3af;">Unsubscribe</a>
  </p>`

// Send via Resend + best-effort measurement log into email_events. Never throws.
async function sendAndLog(supabase: any, apiKey: string, args: {
  to: string; username: string; template: string; subject: string;
  html: string; unsub: string; replyTo?: string;
}): Promise<boolean> {
  let ok = false, resendId: string | null = null, status = 0
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM,
        to: args.to,
        subject: args.subject,
        html: args.html + footer(args.unsub),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        headers: { 'List-Unsubscribe': `<${args.unsub}>` },
      }),
    })
    ok = res.ok
    status = res.status
    try { resendId = (await res.json())?.id ?? null } catch (_) { /* ignore */ }
  } catch (_) { ok = false }
  try {
    await supabase.from('email_events').insert({
      username: args.username, email: args.to, template: args.template,
      event: ok ? 'sent' : 'send_failed', resend_id: resendId,
      meta: ok ? {} : { status },
    })
  } catch (_) { /* email_events may not exist yet — measurement is best-effort */ }
  return ok
}
// ── end shared block ──

// Days of inactivity before sending skill-decay email
const INACTIVE_DAYS_THRESHOLD = 5
// Minimum XP — only target invested users
const MIN_XP_THRESHOLD = 100
// Don't re-email users who were already emailed recently (days)
const COOLDOWN_DAYS = 10
// Days without practice before a skill is considered "at risk"
const SKILL_RUST_DAYS = 7

interface SkillMasteryEntry {
  level: number
  totalAttempts: number
  lastPracticed: string | null
}

interface UserData {
  xp?: number
  lastActive?: string
  email?: string
  emailVerified?: boolean
  skillMastery?: Record<string, SkillMasteryEntry>
  weaknessTracking?: {
    skillLevels?: Record<string, number>
    reviewSchedule?: Array<{ nextReview: string }>
    totalCleared?: number
  }
  solvedChallenges?: string[]
  lastSkillDecayEmail?: string
}

// ── Micro-lessons (N1 experiment, 2026-07-20) ───────────────────────
// One teaching block per skill family: 3-sentence concept + worked
// example + a one-question quiz whose ANSWER LINKS deep-link into the
// app (?quiz=<slug>&pick=X) — the click itself is the measurable return
// hook, independent of the Resend webhook. KEEP THE ANSWER KEY IN SYNC
// with QUIZ_ANSWERS in src/app.jsx. All SQL is SQLite-dialect (no
// ROLLUP, no ORDER BY inside GROUP_CONCAT — that's how #4 and #27
// burned users).
type MicroLesson = {
  slug: string; title: string; concept: string; example: string;
  quiz: { q: string; options: [string, string, string]; correct: 'A' | 'B' | 'C' };
}

const MICRO_LESSONS: MicroLesson[] = [
  { slug: 'select_basics', title: 'SELECT basics',
    concept: 'SELECT picks columns; FROM picks the table; LIMIT caps how many rows come back. Listing explicit columns instead of * keeps output stable when a table changes.',
    example: 'SELECT name, age FROM passengers LIMIT 5;',
    quiz: { q: 'What does SELECT name FROM users LIMIT 3 return?', options: ['All columns for 3 users', 'The name column for up to 3 users', 'Three copies of every name'], correct: 'B' } },
  { slug: 'filtering', title: 'WHERE filtering',
    concept: 'WHERE keeps only rows that pass a condition, and it runs BEFORE grouping or sorting. Combine conditions with AND/OR, and remember text comparisons are exact.',
    example: "SELECT name FROM employees WHERE department = 'Sales' AND salary > 50000;",
    quiz: { q: 'Which clause filters rows before they are grouped?', options: ['HAVING', 'ORDER BY', 'WHERE'], correct: 'C' } },
  { slug: 'aggregation', title: 'Aggregation',
    concept: 'COUNT, SUM, AVG, MIN, MAX collapse many rows into one number. COUNT(*) counts rows; COUNT(col) counts only non-NULL values in that column — the difference matters on messy data.',
    example: 'SELECT COUNT(*) AS total, AVG(salary) AS avg_pay FROM employees;',
    quiz: { q: 'A column has 10 rows, 2 of them NULL. What does COUNT(col) return?', options: ['8', '10', 'NULL'], correct: 'A' } },
  { slug: 'group_by', title: 'GROUP BY',
    concept: 'GROUP BY splits rows into buckets and runs aggregates per bucket. Filter the buckets themselves with HAVING — WHERE cannot see aggregate results.',
    example: 'SELECT department, COUNT(*) AS n FROM employees GROUP BY department HAVING n > 5;',
    quiz: { q: 'How do you keep only departments with more than 5 people?', options: ['WHERE COUNT(*) > 5', 'HAVING COUNT(*) > 5', 'LIMIT 5'], correct: 'B' } },
  { slug: 'joins', title: 'JOINs',
    concept: 'JOIN matches rows across tables via ON. An INNER JOIN drops rows with no match; a LEFT JOIN keeps every row from the left table and fills the right side with NULLs.',
    example: 'SELECT c.name, o.total FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id;',
    quiz: { q: 'Which JOIN keeps customers who have no orders?', options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN'], correct: 'B' } },
  { slug: 'subqueries', title: 'Subqueries',
    concept: 'A subquery is a query inside a query — in WHERE to compare against a computed value, or in FROM as a derived table you can join like any other. Order the inner rows in the subquery when the outer query depends on it.',
    example: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);',
    quiz: { q: 'What does the inner query in WHERE salary > (SELECT AVG(salary)...) produce?', options: ['A table of all salaries', 'One number to compare against', 'An error'], correct: 'B' } },
  { slug: 'string_functions', title: 'String functions',
    concept: "SUBSTR cuts text, || glues it, UPPER/LOWER normalize case, and TRIM strips whitespace. In SQLite, GROUP_CONCAT joins values in a group — but it can't take ORDER BY inside; order rows in a subquery first.",
    example: "SELECT UPPER(name) || ' (' || department || ')' AS label FROM employees;",
    quiz: { q: "In SQLite, how do you get an alphabetically-ordered GROUP_CONCAT?", options: ['GROUP_CONCAT(name ORDER BY name)', 'Order the rows in a subquery, then GROUP_CONCAT', 'SORT_CONCAT(name)'], correct: 'B' } },
  { slug: 'date_functions', title: 'Date functions',
    concept: "SQLite stores dates as text — strftime('%Y', d) extracts parts, DATE() normalizes, and JULIANDAY() turns dates into numbers you can subtract. Text dates only compare correctly in YYYY-MM-DD form.",
    example: "SELECT name FROM employees WHERE strftime('%Y', hire_date) = '2024';",
    quiz: { q: 'How do you count days between two dates in SQLite?', options: ['date2 - date1', 'JULIANDAY(date2) - JULIANDAY(date1)', 'DATEDIFF(date2, date1)'], correct: 'B' } },
  { slug: 'case_statements', title: 'CASE logic',
    concept: 'CASE WHEN turns conditions into values — the SQL if/else. Conditions are checked top to bottom and the first match wins, so order your WHENs from most to least specific.',
    example: "SELECT name, CASE WHEN salary >= 90000 THEN 'high' WHEN salary >= 60000 THEN 'mid' ELSE 'entry' END AS band FROM employees;",
    quiz: { q: 'In a CASE with overlapping WHEN conditions, which one applies?', options: ['The last match', 'The first match, top to bottom', 'All matches combine'], correct: 'B' } },
  { slug: 'window_functions', title: 'Window functions',
    concept: 'Window functions compute across related rows WITHOUT collapsing them — every row stays, each gains a computed column. OVER (PARTITION BY x ORDER BY y) defines the group and order; RANK leaves gaps after ties, DENSE_RANK does not.',
    example: 'SELECT name, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS r FROM employees;',
    quiz: { q: 'Scores 100, 95, 95, 90 — what rank does 90 get with RANK()?', options: ['3', '4', '2'], correct: 'B' } },
  { slug: 'set_operations', title: 'Set operations',
    concept: 'UNION stacks two results and removes duplicates; UNION ALL keeps them (and is faster). Both queries must produce the same number of columns. SQLite has no ROLLUP — build summary rows with a second UNION ALL.',
    example: "SELECT name, 'employee' AS src FROM employees UNION ALL SELECT name, 'customer' FROM customers;",
    quiz: { q: 'What does UNION do that UNION ALL does not?', options: ['Removes duplicate rows', 'Sorts the result', 'Requires same column count'], correct: 'A' } },
  { slug: 'null_handling', title: 'NULL handling',
    concept: "NULL is 'unknown', not zero — col = NULL never matches; use IS NULL / IS NOT NULL. COALESCE(a, b) returns the first non-NULL value, the standard way to default missing data.",
    example: 'SELECT name, COALESCE(phone, \'no phone\') AS contact FROM customers WHERE email IS NOT NULL;',
    quiz: { q: 'Which condition finds rows where phone is missing?', options: ['phone = NULL', 'phone IS NULL', 'phone == 0'], correct: 'B' } },
]

// Loose matcher: weaknessTracking skill names are granular topic labels
// ("CASE + GROUP BY", "UNION / Set Operations", "String Aggregation"...).
function pickMicroLesson(skillName: string): MicroLesson {
  const s = (skillName || '').toLowerCase()
  const rules: Array<[string, string]> = [
    ['window', 'window_functions'], ['rank', 'window_functions'], ['row_number', 'window_functions'],
    ['union', 'set_operations'], ['set operation', 'set_operations'], ['intersect', 'set_operations'],
    ['null', 'null_handling'],
    ['case', 'case_statements'], ['conditional', 'case_statements'],
    ['querying', 'select_basics'],
    ['date', 'date_functions'],
    ['string', 'string_functions'], ['concat', 'string_functions'],
    ['subquer', 'subqueries'], ['derived', 'subqueries'], ['cte', 'subqueries'], ['exists', 'subqueries'],
    ['join', 'joins'],
    ['group', 'group_by'], ['having', 'group_by'],
    ['aggregat', 'aggregation'], ['count', 'aggregation'], ['sum', 'aggregation'], ['avg', 'aggregation'],
    ['where', 'filtering'], ['filter', 'filtering'], ['like', 'filtering'], ['order', 'filtering'],
  ]
  for (const [needle, slug] of rules) {
    if (s.includes(needle)) return MICRO_LESSONS.find(m => m.slug === slug)!
  }
  return MICRO_LESSONS.find(m => m.slug === 'select_basics')!
}

function buildLessonBlock(lesson: MicroLesson): string {
  const quizLink = (pick: string) =>
    `${SITE}/app.html?quiz=${lesson.slug}&pick=${pick}&utm_source=email&utm_campaign=weakskill_${lesson.slug}`
  const opts = ['A', 'B', 'C'] as const
  return `
      <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="font-size: 12px; color: #7c3aed; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">60-second refresher: ${lesson.title}</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.7; margin: 0 0 10px 0;">${lesson.concept}</p>
        <pre style="background: #0f172a; color: #a5f3fc; font-size: 12px; padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 14px 0;"><code>${lesson.example.replace(/</g, '&lt;')}</code></pre>
        <p style="font-size: 14px; color: #1f2937; font-weight: 600; margin: 0 0 8px 0;">Quick check: ${lesson.quiz.q}</p>
        ${opts.map(o => `
        <a href="${quizLink(o)}" style="display: block; padding: 9px 12px; margin: 6px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; color: #374151; font-size: 13px; text-decoration: none;">
          <strong style="color: #7c3aed;">${o}.</strong> ${lesson.quiz.options[opts.indexOf(o)]}
        </a>`).join('')}
        <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0 0;">Tap an answer — you'll see if you're right in the app.</p>
      </div>`
}
// ── end micro-lessons ──

/** Build the same skill context the frontend exposes via getSkillEmailContext() */
function buildSkillEmailContext(userData: UserData) {
  const skillLevels = userData.weaknessTracking?.skillLevels || {}
  const entries = Object.entries(skillLevels).filter(([_, v]) => v > 0)
  if (entries.length === 0) return null

  const sorted = [...entries].sort((a, b) => a[1] - b[1])
  const weakest = sorted[0]
  const strongest = sorted[sorted.length - 1]
  const avg = Math.round(entries.reduce((sum, [_, v]) => sum + v, 0) / entries.length)
  const tier = avg >= 80 ? 'Master' : avg >= 60 ? 'Advanced' : avg >= 40 ? 'Intermediate' : 'Beginner'

  // Days since last activity
  const skillMastery = userData.skillMastery || {}
  const lastPracticed = Object.values(skillMastery)
    .map(d => d.lastPracticed)
    .filter(Boolean)
    .sort()
    .pop()
  const daysSinceActivity = lastPracticed
    ? Math.floor((Date.now() - new Date(lastPracticed).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Skills at risk (idle 7+ days and level > 1)
  const atRiskSkills = Object.entries(skillMastery)
    .filter(([_, d]) => {
      if (!d.lastPracticed || d.totalAttempts === 0) return false
      const idle = (Date.now() - new Date(d.lastPracticed).getTime()) / (1000 * 60 * 60 * 24)
      return idle > SKILL_RUST_DAYS && d.level > 1
    })
    .map(([name]) => name)

  const dueReviews = (userData.weaknessTracking?.reviewSchedule || [])
    .filter(r => new Date(r.nextReview) <= new Date()).length

  return {
    weakestSkill: weakest[0],
    weakestScore: weakest[1],
    strongestSkill: strongest[0],
    strongestScore: strongest[1],
    averageProficiency: avg,
    tier,
    totalSkillsTracked: entries.length,
    skillsAbove70: entries.filter(([_, v]) => v >= 70).length,
    skillsBelow40: entries.filter(([_, v]) => v < 40).length,
    daysSinceActivity,
    atRiskSkills,
    dueReviews,
    totalWeaknessesCleared: userData.weaknessTracking?.totalCleared || 0,
  }
}

function buildEmailHtml(username: string, ctx: ReturnType<typeof buildSkillEmailContext>) {
  if (!ctx) return null

  const atRiskList = ctx.atRiskSkills.length > 0
    ? ctx.atRiskSkills.slice(0, 3).map(s => `<span style="display:inline-block;padding:4px 10px;background:#fef2f2;color:#dc2626;border-radius:6px;font-size:13px;margin:2px 4px;">${s}</span>`).join(' ')
    : ''

  const daysMsg = ctx.daysSinceActivity
    ? `${ctx.daysSinceActivity} day${ctx.daysSinceActivity !== 1 ? 's' : ''}`
    : 'a while'

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #db2777); line-height: 48px; font-size: 24px;">⚡</div>
      </div>
      <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Your SQL skills are fading, ${username}!</h2>
      <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
        It's been ${daysMsg} since your last practice. Skills decay without regular use — don't let your progress slip away.
      </p>

      <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 24px; font-weight: bold; color: #7c3aed; margin: 0;">${ctx.averageProficiency}%</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">${ctx.tier} tier</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 24px; font-weight: bold; color: #059669; margin: 0;">${ctx.skillsAbove70}</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">strong skills</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <p style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 0;">${ctx.atRiskSkills.length}</p>
            <p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">at risk</p>
          </div>
        </div>

        ${ctx.atRiskSkills.length > 0 ? `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; font-weight: 600;">SKILLS GETTING RUSTY:</p>
          <div>${atRiskList}</div>
        </div>
        ` : ''}
      </div>

      ${ctx.dueReviews > 0 ? `
      <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <p style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0;">
          📋 ${ctx.dueReviews} review${ctx.dueReviews > 1 ? 's' : ''} waiting for you
        </p>
        <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0;">
          Your spaced repetition schedule has items ready to review.
        </p>
      </div>
      ` : ''}

      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          <strong>Your weakest area:</strong> ${ctx.weakestSkill} at ${ctx.weakestScore}%.
          Here's a 60-second refresher — right in this email.
        </p>
      </div>

      ${buildLessonBlock(pickMicroLesson(ctx.weakestSkill))}

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${utm('/app.html', 'weakskill_' + pickMicroLesson(ctx.weakestSkill).slug)}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Drill ${pickMicroLesson(ctx.weakestSkill).title} now →
        </a>
      </div>
    </div>
  `
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000)

    // Get all users with emails
    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('email', 'is', null)

    if (error) throw error

    let sent = 0
    let skipped = 0

    // Dry-run: ?dry=1 computes the would-send list (with the lesson each
    // user would get) without sending or stamping.
    const dryRun = new URL(req.url).searchParams.get('dry') === '1'
    const wouldSend: Array<{ username: string; weakest: string; lesson: string }> = []

    for (const user of (users || [])) {
      if (!user.email) { skipped++; continue }
      if (isInternalAccount(user.username, user.email)) { skipped++; continue }

      const userData: UserData = user.data || {}
      const xp = userData.xp || 0

      // Honor the global email opt-out (set via unsubscribe link).
      if ((userData as any).emailOptOut === true) { skipped++; continue }

      // Only target invested users (XP >= 100)
      if (xp < MIN_XP_THRESHOLD) { skipped++; continue }

      // Skip users who are still active
      if (userData.lastActive) {
        const lastActiveDate = new Date(userData.lastActive)
        if (lastActiveDate >= cutoffDate) { skipped++; continue }
      } else {
        // No lastActive means we can't determine inactivity — skip
        skipped++; continue
      }

      // Skip users who were already sent a skill-decay email recently
      const lastDecayEmail = userData.lastSkillDecayEmail
      if (lastDecayEmail) {
        const lastSent = new Date(lastDecayEmail)
        const cooloffEnd = new Date(lastSent.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
        if (now < cooloffEnd) { skipped++; continue }
      }

      // Build skill context (mirrors getSkillEmailContext from the frontend)
      const ctx = buildSkillEmailContext(userData)
      if (!ctx) { skipped++; continue }

      // Only send if there are at-risk skills or low proficiency
      if (ctx.atRiskSkills.length === 0 && ctx.averageProficiency >= 70) {
        skipped++; continue
      }

      if (dryRun) {
        wouldSend.push({ username: user.username, weakest: ctx.weakestSkill, lesson: pickMicroLesson(ctx.weakestSkill).slug })
        continue
      }

      const html = buildEmailHtml(user.username, ctx)
      if (!html) { skipped++; continue }

      const lesson = pickMicroLesson(ctx.weakestSkill)
      const subject = `🧠 Your ${ctx.weakestSkill} is getting rusty — 60-second refresher inside`

      const unsubToken = await ensureUnsubToken(supabase, user.username, userData)
      // Template renamed from 'skill_decay' on purpose (N1 experiment,
      // 2026-07-20): the old nudge-only sends stay the control cohort in
      // email_events; lesson-bearing sends measure against them.
      const ok = await sendAndLog(supabase, RESEND_API_KEY, {
        to: user.email, username: user.username, template: 'skill_decay_lesson',
        subject, html, unsub: unsubLink(unsubToken),
      })

      if (ok) {
        // Mark that we sent a skill-decay email (prevent spam)
        await supabase
          .from('users')
          .update({ data: { ...userData, lastSkillDecayEmail: now.toISOString() } })
          .eq('username', user.username)
        sent++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, total: users?.length || 0, ...(dryRun ? { dryRun: true, wouldSend } : {}) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
