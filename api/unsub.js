// Unsubscribe endpoint for the capture-email-drip.
//
// WHY THIS EXISTS
// ---------------
// capture-email-drip builds its unsubscribe link as `${SITE}/api/unsub?t=<token>`
// with SITE = https://sqlquest.app. That route did not exist. It returned 404.
//
// Measured 2026-07-26: 78 leads, 77 of them had received drip mail (up to index
// 4, so as many as five emails each), every one carrying a link that went
// nowhere — and 0 rows with unsubscribed = true. Zero opt-outs across 77 people
// and hundreds of sends is not "nobody wanted to leave", it is the signature of
// a mechanism that could not work.
//
// A non-functional unsubscribe is the least defensible thing an email programme
// can ship: CAN-SPAM requires the opt-out to work for 30 days after a send, and
// GDPR requires withdrawing consent to be as easy as giving it.
//
// Fixed HERE rather than in the drip's URL because the broken links are already
// sitting in 77 inboxes. Changing the sender only helps future mail; making this
// route work repairs every email already delivered.
//
// The actual state change needs the service role, which lives in the
// email-unsubscribe edge function. This calls that function server-side and
// renders the outcome itself, so the response is real HTML with a real
// content-type rather than whatever the function gateway decides to label it.
const SUPABASE_URL = 'https://abmgtjafghpupaqsjnwe.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

// Tokens are hex from gen_random_bytes(16) for leads, and a similar opaque
// string for registered users. Anything else cannot match a row, so reject it
// before spending a call — and before putting it anywhere near the page.
const TOKEN_RE = /^[A-Za-z0-9_-]{8,128}$/;

function page({ title, heading, body, showCta }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · SQL Quest</title>
<style>
  body{margin:0;background:#0E0F13;color:#F2F0EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{background:#16181F;border:1px solid #2A2E38;border-radius:16px;padding:36px 32px;max-width:440px;text-align:center}
  h1{font-size:22px;font-weight:800;margin:0 0 12px}
  p{font-size:14.5px;color:#8A8E99;line-height:1.7;margin:0 0 18px}
  a.btn{display:inline-block;padding:12px 24px;background:#FFE34D;color:#0E0F13;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px}
  a.plain{color:#8A8E99;font-size:13px}
</style>
</head><body><div class="card">
<h1>${heading}</h1>
<p>${body}</p>
${showCta ? '<a class="btn" href="https://sqlquest.app/">Back to SQL Quest</a>' : '<a class="plain" href="https://sqlquest.app/">sqlquest.app</a>'}
</div></body></html>`;
}

export default async function handler(req, res) {
  const send = (status, html) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Never cache an unsubscribe outcome.
    res.setHeader('Cache-Control', 'no-store');
    return res.status(status).send(html);
  };

  const t = String((req.query && req.query.t) || '').trim();
  const ut = String((req.query && req.query.ut) || '').trim();

  if (!t && !ut) {
    return send(400, page({
      title: 'Unsubscribe',
      heading: 'That link is incomplete',
      body: 'The unsubscribe link is missing its token. Reply to any of our emails, or use the feedback button in the app, and we will take you off the list by hand.',
      showCta: false,
    }));
  }

  const token = t || ut;
  if (!TOKEN_RE.test(token)) {
    return send(400, page({
      title: 'Unsubscribe',
      heading: "That link doesn't look right",
      body: 'We could not read the token in this link. Reply to any of our emails and we will unsubscribe you by hand.',
      showCta: false,
    }));
  }

  const qs = t ? `t=${encodeURIComponent(t)}` : `ut=${encodeURIComponent(ut)}`;

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/email-unsubscribe?${qs}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    // The upstream deliberately does not reveal whether a token matched, so a
    // 200 is all the confirmation available — and all the user needs.
    return send(200, page({
      title: 'Unsubscribed',
      heading: "You're unsubscribed",
      body: 'You will not get any more product or marketing email from SQL Quest. Anything you actually asked for — a password reset, a receipt — still reaches you. Your account and progress are untouched.',
      showCta: true,
    }));
  } catch (e) {
    console.error('unsub failed', e);
    // Do not tell someone "unsubscribed" when we could not confirm it.
    return send(502, page({
      title: 'Unsubscribe',
      heading: "We couldn't complete that just now",
      body: 'Something on our side failed, so we will not claim you are unsubscribed when we cannot confirm it. Please try the link again in a few minutes, or reply to any of our emails and we will remove you by hand.',
      showCta: false,
    }));
  }
}

export const _internals = { TOKEN_RE, page };
