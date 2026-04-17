// Supabase Edge Function: capture-email-drip
// Deploy: supabase functions deploy capture-email-drip
//
// Daily cron. Iterates `email_captures`, sends the next drip email to each
// recipient whose spacing schedule has arrived. Five emails total, spread
// over 10 days. After the last, the recipient "graduates" — no further
// sends. Each email links back to sqlquest.app with a drip-index query
// param for attribution.
//
// REQUIRED SCHEMA ADDITIONS to public.email_captures (run once in Supabase
// SQL editor on top of the base migration from supabase/functions/
// capture-email/index.ts):
//
//   alter table public.email_captures
//     add column if not exists unsubscribed        boolean     not null default false,
//     add column if not exists unsubscribe_token   text,
//     add column if not exists last_drip_index     int         not null default -1,
//     add column if not exists last_drip_sent_at   timestamptz;
//
//   create index if not exists email_captures_drip_idx
//     on public.email_captures (unsubscribed, last_drip_index, last_drip_sent_at);
//
// Backfill unsubscribe_token for existing rows:
//
//   update public.email_captures
//     set unsubscribe_token = encode(gen_random_bytes(16), 'hex')
//     where unsubscribe_token is null;
//
// CRON: schedule daily at 14:00 UTC (9am ET / 6am PT):
//
//   select cron.schedule(
//     'capture-email-drip',
//     '0 14 * * *',
//     $$
//       select net.http_post(
//         url:='https://<project>.supabase.co/functions/v1/capture-email-drip',
//         headers:=jsonb_build_object('Authorization', 'Bearer ' || current_setting('supabase.service_role_key'))
//       );
//     $$
//   );
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type DripEmail = {
  index: number
  dayOffset: number     // days after capture before this email becomes eligible
  subject: string
  preheader: string
  html: (args: { unsubUrl: string; ctaUrl: string }) => string
}

const SITE = 'https://sqlquest.app'

// Each email carries ONE tiny challenge, keeps length short, ends with a CTA.
// dayOffsets are cumulative from capture: 0, 2, 4, 6, 10.
const DRIP: DripEmail[] = [
  {
    index: 0,
    dayOffset: 0,
    subject: 'Your first SQL challenge (60-second solve)',
    preheader: 'Welcome. One challenge a day, no filler.',
    html: ({ unsubUrl, ctaUrl }) => emailShell({
      title: 'Your first SQL challenge',
      body: `
        <p>You signed up because videos stopped sticking. Same reason we built this.</p>
        <p>Here's today's warm-up — 60 seconds, Easy:</p>
        <blockquote style="${QB}">
          Given a <code>passengers</code> table with columns <code>name, class, survived</code>, write a query that returns <strong>the count of survivors per class</strong>, sorted by class.
        </blockquote>
        <p>Click below to solve it in the browser and see the result.</p>
      `,
      ctaUrl,
      ctaLabel: 'Solve it now →',
      footer: `Tomorrow: the one GROUP BY gotcha every analyst hits.`,
      unsubUrl,
    }),
  },
  {
    index: 1,
    dayOffset: 2,
    subject: 'The GROUP BY gotcha nobody warns you about',
    preheader: "HAVING vs WHERE — they don't do what you think.",
    html: ({ unsubUrl, ctaUrl }) => emailShell({
      title: 'HAVING vs WHERE',
      body: `
        <p><strong>WHERE</strong> filters rows before aggregation. <strong>HAVING</strong> filters groups after.</p>
        <p>Interviewers love this one:</p>
        <blockquote style="${QB}">
          Find classes where <strong>more than 100 passengers survived</strong>. (Not passengers where survived > 100 — that's a different query.)
        </blockquote>
        <p>Write it both ways in your head. Then try it in the app.</p>
      `,
      ctaUrl,
      ctaLabel: 'Try both ways →',
      footer: `Coming up: the pattern 34% of FAANG SQL questions use.`,
      unsubUrl,
    }),
  },
  {
    index: 2,
    dayOffset: 4,
    subject: 'Can you write RANK() from memory?',
    preheader: 'Window functions — the ceiling test.',
    html: ({ unsubUrl, ctaUrl }) => emailShell({
      title: 'Window Functions from cold memory',
      body: `
        <p>If you can write this without peeking, you're ahead of most bootcamp grads:</p>
        <blockquote style="${QB}">
          Rank every passenger by fare paid, within their class. Highest fare = rank 1.
        </blockquote>
        <p>Hint: you need <code>RANK() OVER (PARTITION BY ... ORDER BY ... DESC)</code>. That's the whole thing.</p>
        <p>If the syntax didn't come to you, that's the gap. Let the Coach drill it.</p>
      `,
      ctaUrl,
      ctaLabel: 'Solve it in the browser →',
      footer: `Half the course-grad audience freezes on this one. Normal.`,
      unsubUrl,
    }),
  },
  {
    index: 3,
    dayOffset: 6,
    subject: 'Top-N per group — every analyst job asks this',
    preheader: "The single most asked analyst interview pattern.",
    html: ({ unsubUrl, ctaUrl }) => emailShell({
      title: 'Top-N per group',
      body: `
        <p>The pattern: "for each <em>group</em>, find the <em>top N rows</em> by <em>some metric</em>."</p>
        <p>Examples you'll see on the job and in interviews:</p>
        <ul style="color:#64748b;font-size:14px;line-height:1.7;margin:8px 0">
          <li>Top 3 products per category by revenue</li>
          <li>Highest-paid employee in each department</li>
          <li>Most-watched movie per genre</li>
        </ul>
        <p>Today's challenge uses it on fare data. Window functions make it one query.</p>
      `,
      ctaUrl,
      ctaLabel: 'Tackle it →',
      footer: `Last email coming — the full Coach curriculum if you want it.`,
      unsubUrl,
    }),
  },
  {
    index: 4,
    dayOffset: 10,
    subject: "Done with drips — here's the full Coach",
    preheader: "Pick a goal. It tells you what to do next.",
    html: ({ unsubUrl, ctaUrl }) => emailShell({
      title: 'Last drip. Next step is the real thing.',
      body: `
        <p>If the past 4 emails felt useful, the in-app Coach does this full-time — but adapted to <em>your</em> skill radar.</p>
        <p>You pick a goal (Fundamentals, FAANG Prep, or Analyst Day-One). It reads your radar from the placement check, skips what you know, and drills what you don't.</p>
        <p>Mastery checks require fresh solves — no recognising. Retrieval checks schedule a cold re-solve a day later. That's how it sticks.</p>
        <p>Still free. No credit card.</p>
      `,
      ctaUrl,
      ctaLabel: 'Start a goal, free →',
      footer: `Thanks for reading. Reply if you have feedback — we read every email.`,
      unsubUrl,
    }),
  },
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const now = Date.now()

  // Pull every active capture. Volume will be small at first; if this grows
  // past ~5k, paginate by captured_at or batch by drip index.
  const { data: rows, error } = await supabase
    .from('email_captures')
    .select('email, captured_at, unsubscribe_token, last_drip_index, last_drip_sent_at')
    .eq('unsubscribed', false)
    .lt('last_drip_index', DRIP.length - 1)

  if (error) {
    console.error('[drip] select error:', error.message)
    return json({ ok: false, error: 'query_failed' }, 500)
  }

  let sent = 0
  let skipped = 0
  let failed = 0
  const perEmail: Record<string, number> = {}

  for (const row of rows || []) {
    const capturedMs = row.captured_at ? new Date(row.captured_at).getTime() : 0
    const lastIdx = row.last_drip_index ?? -1
    const nextIdx = lastIdx + 1
    const nextEmail = DRIP[nextIdx]
    if (!nextEmail) { skipped++; continue }

    // Day-offset gate — don't send #N until N-th offset has elapsed since capture
    const dueMs = capturedMs + nextEmail.dayOffset * 86400_000
    if (now < dueMs) { skipped++; continue }

    // Belt-and-suspenders: also require 1 day minimum between any two drips
    // (so a cron-backfill doesn't blast 5 emails in an hour).
    const lastSentMs = row.last_drip_sent_at ? new Date(row.last_drip_sent_at).getTime() : 0
    if (lastIdx >= 0 && now - lastSentMs < 86400_000) { skipped++; continue }

    const token = row.unsubscribe_token || ''
    const unsubUrl = `${SITE}/api/unsub?t=${encodeURIComponent(token)}`
    const ctaUrl = `${SITE}/after-the-sql-course/?drip=${nextIdx}&t=${encodeURIComponent(token)}`

    try {
      await sendViaResend(RESEND_KEY, {
        to: row.email,
        subject: nextEmail.subject,
        preheader: nextEmail.preheader,
        html: nextEmail.html({ unsubUrl, ctaUrl }),
      })
      await supabase
        .from('email_captures')
        .update({ last_drip_index: nextIdx, last_drip_sent_at: new Date().toISOString() })
        .eq('email', row.email)
      sent++
      perEmail[nextIdx] = (perEmail[nextIdx] || 0) + 1
    } catch (e) {
      console.error(`[drip] send failed for ${row.email} #${nextIdx}:`, (e as Error).message)
      failed++
    }
  }

  return json({ ok: true, sent, skipped, failed, perEmailIndex: perEmail })
})

async function sendViaResend(apiKey: string, args: { to: string; subject: string; preheader: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SQL Quest <hello@sqlquest.app>',
      to: args.to,
      subject: args.subject,
      html: args.html,
      // Preheader trick: invisible span at the top
      text: args.preheader,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }
  return res.json()
}

const QB = `
  border-left: 3px solid #7c3aed;
  background: #f8f5ff;
  padding: 14px 18px;
  margin: 16px 0;
  color: #1a1a2e;
  font-size: 15px;
  line-height: 1.65;
  border-radius: 4px;
`

function emailShell(args: { title: string; body: string; ctaUrl: string; ctaLabel: string; footer: string; unsubUrl: string }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(args.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a2e">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-size:13px;color:#64748b;margin-bottom:16px">
      <span style="font-weight:700;color:#7c3aed">⚡ SQL Quest</span>
    </div>
    <h1 style="font-size:26px;font-weight:800;line-height:1.2;margin:0 0 18px;color:#0a0a18">${escape(args.title)}</h1>
    <div style="font-size:15px;line-height:1.7;color:#2a2e38">
      ${args.body}
    </div>
    <div style="margin:28px 0 12px">
      <a href="${escape(args.ctaUrl)}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">${escape(args.ctaLabel)}</a>
    </div>
    <p style="font-size:13px;color:#94a3b8;font-style:italic;margin:24px 0 0">${escape(args.footer)}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:36px 0 18px">
    <p style="font-size:11px;color:#94a3b8;line-height:1.6">
      You got this because you asked to on sqlquest.app. 5 emails total. No marketing filler.
      <br>Not for you? <a href="${escape(args.unsubUrl)}" style="color:#64748b">Unsubscribe</a>.
    </p>
  </div>
</body></html>`
}

function escape(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
