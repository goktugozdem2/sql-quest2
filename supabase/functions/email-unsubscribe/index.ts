// Supabase Edge Function: email-unsubscribe
// Deploy: supabase functions deploy email-unsubscribe
//
// Public GET endpoint for unsubscribe links in drip emails. Flips the
// `unsubscribed` flag on the matching row in email_captures. Never reveals
// whether the token matched — always returns the same success page.
//
// Link shape (from drip emails):
//   https://sqlquest.app/api/unsub?t=<token>
//
// Requires a Vercel (or equivalent) rewrite so /api/unsub/* maps to this
// function — or point drip emails directly at the Supabase URL:
//   https://<project>.supabase.co/functions/v1/email-unsubscribe?t=<token>
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const token = (url.searchParams.get('t') || '').trim()

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return htmlResponse(successPage(), 200)
  }

  // Even on empty token we return success — don't leak list membership by
  // responding differently to valid vs invalid tokens.
  if (token && token.length <= 128) {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
    const { error } = await supabase
      .from('email_captures')
      .update({ unsubscribed: true })
      .eq('unsubscribe_token', token)
    if (error) console.error('[unsub] update error:', error.message)
  }

  return htmlResponse(successPage(), 200)
})

function htmlResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function successPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed · SQL Quest</title>
  <style>
    body { margin:0;padding:0;background:#06060f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh }
    .card { background:rgba(10,10,25,.6);border:1px solid rgba(124,58,237,.24);border-radius:16px;padding:36px 32px;max-width:420px;text-align:center }
    h1 { font-size:22px;font-weight:800;margin:0 0 12px;color:#f1f5f9 }
    p { font-size:14px;color:#94a3b8;line-height:1.7;margin:0 0 18px }
    a.btn { display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:40px;margin-bottom:12px">✓</div>
    <h1>You're unsubscribed</h1>
    <p>We won't send you the drip sequence again. If you ever want to come back, just open SQL Quest — no emails required.</p>
    <a class="btn" href="https://sqlquest.app">Back to SQL Quest</a>
  </div>
</body>
</html>`
}
