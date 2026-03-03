// Supabase Edge Function: streak-reminder
// Deploy: supabase functions deploy streak-reminder
// Schedule: Run daily via Supabase cron (pg_cron) or external scheduler
//
// This sends streak reminder emails to users who:
// 1. Haven't been active today
// 2. Have a streak > 0
// 3. Have an email on file
//
// Setup:
// 1. Enable Supabase Auth email or store emails in users table
// 2. Set RESEND_API_KEY in Supabase secrets (or use another email provider)
// 3. Deploy this function
// 4. Schedule it to run daily at 6pm user's timezone (or fixed time)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get users with streaks who haven't been active today
    const today = new Date().toISOString().split('T')[0]
    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('email', 'is', null)

    if (error) throw error

    let sent = 0
    for (const user of (users || [])) {
      if (!user.email) continue

      const userData = user.data || {}
      const dailyStreak = userData.dailyStreak || 0
      const lastActive = userData.lastActive

      // Skip if no streak to protect
      if (dailyStreak === 0) continue

      // Skip if already active today
      if (lastActive) {
        const lastDate = new Date(lastActive).toISOString().split('T')[0]
        if (lastDate === today) continue
      }

      // Send streak reminder
      const streakEmoji = dailyStreak >= 30 ? '🏆' : dailyStreak >= 14 ? '🔥🔥' : '🔥'
      const subject = `${streakEmoji} Your ${dailyStreak}-day SQL streak is at risk!`
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #db2777); line-height: 48px; font-size: 24px;">⚡</div>
          </div>
          <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Don't lose your ${dailyStreak}-day streak!</h2>
          <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
            You're on a roll, ${user.username}! Complete today's challenge to keep your streak alive.
          </p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; margin: 0;">${streakEmoji}</p>
            <p style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 4px 0;">${dailyStreak} day streak</p>
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">Don't break the chain!</p>
          </div>
          <div style="text-align: center;">
            <a href="https://sqlquest.app/app.html" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Practice Now →
            </a>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 32px;">
            SQL Quest — Master SQL through practice<br>
            <a href="https://sqlquest.app" style="color: #9ca3af;">sqlquest.app</a>
          </p>
        </div>
      `

      // Send via Resend
      await fetch('https://api.resend.com/emails', {
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
      sent++
    }

    return new Response(JSON.stringify({ sent, total: users?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
