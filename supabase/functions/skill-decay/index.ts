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
          A quick 5-minute drill can boost it back up.
        </p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://sqlquest.app/app.html" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          Refresh Your Skills →
        </a>
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
        SQL Quest — Master SQL through practice<br>
        <a href="https://sqlquest.app" style="color: #9ca3af;">sqlquest.app</a>
      </p>
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

    for (const user of (users || [])) {
      if (!user.email) { skipped++; continue }

      const userData: UserData = user.data || {}
      const xp = userData.xp || 0

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

      const html = buildEmailHtml(user.username, ctx)
      if (!html) { skipped++; continue }

      const subject = ctx.atRiskSkills.length > 0
        ? `🧠 ${ctx.atRiskSkills.length} SQL skill${ctx.atRiskSkills.length > 1 ? 's' : ''} getting rusty — practice to keep them sharp`
        : `📉 Your SQL proficiency dropped to ${ctx.averageProficiency}% — a quick drill can fix that`

      // Send via Resend
      const emailResult = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'SQL Quest <noreply@sqlquest.app>',
          to: user.email,
          subject,
          html
        })
      })

      if (emailResult.ok) {
        // Mark that we sent a skill-decay email (prevent spam)
        await supabase
          .from('users')
          .update({ data: { ...userData, lastSkillDecayEmail: now.toISOString() } })
          .eq('username', user.username)
        sent++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, total: users?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
