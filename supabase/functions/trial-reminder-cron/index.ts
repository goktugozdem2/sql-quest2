// Supabase Edge Function: trial-reminder-cron
// Deploy: supabase functions deploy trial-reminder-cron
//
// Daily cron. Sends two trial-expiry reminder emails to users on the
// 7-day Pro trial:
//
//   - "2 days left"   — fires when 24-48h remain until proExpiry
//   - "Trial ends today" — fires when 0-24h remain until proExpiry
//
// Each user receives each reminder at most once per trial cycle. State
// is tracked in users.data jsonb (no schema migration needed):
//
//   data.trialReminder_2days_sent_at: ISO timestamp
//   data.trialReminder_1day_sent_at:  ISO timestamp
//
// Closes the gap in the trial-end UX: in-app banner only fires when
// the user opens the app on day 5/6/7. If they're idle, they'd lose
// access silently on day 8 without any prompt to convert. Email keeps
// the funnel intact for idle users.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.
//
// CRON: schedule daily at 14:00 UTC. Add to pg_cron from Supabase
// SQL editor (replace YOUR_PROJECT_REF):
//
//   select cron.schedule(
//     'trial-reminder-cron',
//     '0 14 * * *',
//     $$
//       select net.http_post(
//         url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/trial-reminder-cron',
//         headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_OR_FUNCTION_KEY"}'::jsonb,
//         body := '{}'::jsonb
//       );
//     $$
//   );

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fetch all trial users with an email and proExpiry
  const userQuery = `${SUPABASE_URL}/rest/v1/users?select=username,email,data,updated_at&data->>proType=eq.trial`;
  const usersRes = await fetch(userQuery, {
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!usersRes.ok) {
    const txt = await usersRes.text();
    return new Response(
      JSON.stringify({ error: `Fetch users failed: ${usersRes.status}`, body: txt }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const users = await usersRes.json();
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const log: any[] = [];

  for (const user of users) {
    try {
      const email = user.email || user.data?.email;
      if (!email) {
        log.push({ user: user.username, skip: "no_email" });
        continue;
      }
      const proExpiry = user.data?.proExpiry;
      if (!proExpiry) {
        log.push({ user: user.username, skip: "no_expiry" });
        continue;
      }
      const hoursLeft = (new Date(proExpiry).getTime() - now) / ONE_HOUR;

      // Already expired or > 48h — skip
      if (hoursLeft <= 0) {
        log.push({ user: user.username, skip: "expired" });
        continue;
      }
      if (hoursLeft > 48) {
        log.push({ user: user.username, skip: "too_early", hoursLeft: Math.round(hoursLeft) });
        continue;
      }

      // Decide which reminder applies
      const isLastDay = hoursLeft <= 24;
      const reminderKey = isLastDay
        ? "trialReminder_1day_sent_at"
        : "trialReminder_2days_sent_at";

      if (user.data?.[reminderKey]) {
        log.push({ user: user.username, skip: "already_sent", which: reminderKey });
        continue;
      }

      // Send the email
      const subject = isLastDay
        ? "Your sqlquest Pro trial ends today"
        : "Your sqlquest Pro trial ends in 2 days";

      const html = renderEmail({
        username: user.username,
        email,
        isLastDay,
        hoursLeft: Math.round(hoursLeft),
      });

      const sendRes = await sendViaResend(RESEND_KEY, {
        to: email,
        subject,
        preheader: isLastDay
          ? "Don't lose Hard challenges, sectors, mock interviews, and unlimited AI tutor."
          // Was "$19/month" — a price we have never charged on this plan. The
          // live modal in src/app.jsx is the source of truth and reads $29/mo.
          // This preheader is the first line a trial user sees in their inbox.
          : "Lock in Pro before your trial ends. 30 seconds, $29/month.",
        html,
      });

      // Log the send so resend-webhook can resolve its own deliveries. This
      // function is on an ACTIVE daily cron but appears in no documentation
      // and wrote nothing to email_events, so every delivery it produced
      // landed as template='unknown'. Best-effort — never block a send.
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
          method: "POST",
          headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            username: user.username,
            email,
            template: isLastDay ? "trial_reminder_1day" : "trial_reminder_2days",
            event: "sent",
            resend_id: (sendRes as any)?.id ?? null,
            meta: { hoursLeft: Math.round(hoursLeft) },
          }),
        });
      } catch (_) { /* measurement must not cost a send */ }

      // Mark sent — patch users.data
      const newData = { ...(user.data || {}), [reminderKey]: new Date().toISOString() };
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(user.username)}`,
        {
          method: "PATCH",
          headers: {
            "apikey": SERVICE_KEY,
            "Authorization": `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ data: newData }),
        }
      );

      if (!patchRes.ok) {
        log.push({ user: user.username, sent: false, patch_status: patchRes.status });
      } else {
        log.push({ user: user.username, sent: true, which: reminderKey, hoursLeft: Math.round(hoursLeft) });
      }
    } catch (err) {
      log.push({ user: user.username, error: String(err) });
    }
  }

  return new Response(
    JSON.stringify({ processed: users.length, log }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// --- Email rendering -------------------------------------------------

function renderEmail(args: { username: string; email: string; isLastDay: boolean; hoursLeft: number }) {
  const { username, isLastDay, hoursLeft } = args;
  const headline = isLastDay
    ? "Your Pro trial ends today"
    : "2 days left in your Pro trial";

  const lead = isLastDay
    ? "Today is the last day of your free 7-day Pro trial. After today, Hard challenges, sector tracks (banking, real estate, manufacturing), the full mock-interview bank, and unlimited AI tutor will lock."
    : "You have about " + hoursLeft + " hours left on your free 7-day Pro trial. Hard challenges, sector tracks, mock interviews, and unlimited AI tutor will lock when the trial ends.";

  const upgradeUrl = `https://buy.stripe.com/bJe14o2uleSw8m20nOdMI0a?client_reference_id=${encodeURIComponent(username)}`;
  const appUrl = `https://sqlquest.app/app.html`;

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0a0a18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a18;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#16181F;border:1px solid #2A2E38;border-radius:10px;padding:36px 28px;">
        <tr><td>
          <div style="font-size:13px;color:#94a3b8;letter-spacing:0.04em;text-transform:uppercase;font-weight:700;margin-bottom:8px;">
            ${isLastDay ? '⏳ Last day' : '⏳ Trial ending soon'}
          </div>
          <h1 style="font-size:28px;line-height:1.2;color:#F2F0EA;margin:0 0 16px;font-weight:800;">
            ${headline}
          </h1>
          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
            Hi ${username},
          </p>
          <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 24px;">
            ${lead}
          </p>
          <div style="background:#1F222B;border-radius:8px;padding:18px 20px;margin-bottom:28px;">
            <p style="font-size:13px;color:#94a3b8;margin:0 0 8px;font-weight:600;">What you'll lose:</p>
            <ul style="margin:0;padding:0 0 0 20px;color:#cbd5e1;font-size:14px;line-height:1.8;">
              <li>Hard challenges (FAANG-level interview prep)</li>
              <li>Sector tracks — banking, real estate, manufacturing</li>
              <li>Full Mock Interview bank with timed pressure</li>
              <li>Unlimited AI tutor (Free is capped at 10/day)</li>
              <li>30-Day Challenge full streak path</li>
            </ul>
          </div>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
            <tr><td style="background:#7c3aed;border-radius:8px;">
              <a href="${upgradeUrl}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">
                Lock in Pro — $19/mo
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;line-height:1.6;color:#94a3b8;text-align:center;margin:0 0 8px;">
            Or come back to the app: <a href="${appUrl}" style="color:#a78bfa;text-decoration:underline;">sqlquest.app</a>
          </p>
          <p style="font-size:12px;line-height:1.6;color:#64748b;text-align:center;margin:24px 0 0;">
            No commitment. Cancel anytime. The Coach, skill radar, and ~75 challenges
            stay yours forever on the free tier.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendViaResend(
  apiKey: string,
  args: { to: string; subject: string; preheader: string; html: string }
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SQL Quest <hi@sqlquest.app>",
      to: [args.to],
      subject: args.subject,
      html: args.html,
      headers: {
        "List-Unsubscribe": "<mailto:unsubscribe@sqlquest.app>",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return await res.json();
}
