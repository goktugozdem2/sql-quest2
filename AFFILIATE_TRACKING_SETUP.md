# Affiliate Tracking — Deploy Steps

Code is shipped. Three Supabase steps remaining (you do these in the
dashboard, I can't from here):

## 1. Run the migration SQL

Open the Supabase SQL editor and paste the contents of
[`referrals-setup.sql`](./referrals-setup.sql). Hit Run. Creates two
tables (`referrals`, `referral_partners`), three indexes, and one
aggregation function (`get_referral_stats`).

The migration is idempotent — safe to re-run if anything fails halfway.

## 2. Set the dashboard password

Pick a long random string. **Do NOT reuse the in-app `adminadmin`
password** — this one gates aggregated affiliate data and deserves its
own credential.

```bash
supabase secrets set REFERRALS_ADMIN_PASSWORD=<32-char-random-string>
```

(Or via dashboard: Project Settings → Edge Functions → Add new secret.)

If you need to generate one quickly:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

## 3. Deploy the two edge functions

```bash
supabase functions deploy track-referral
supabase functions deploy referrals-summary
```

`track-referral` is public (any anon caller can submit a click event —
that's by design, the landing pages need it). `referrals-summary` is
gated by the password from step 2.

## 4. (Optional) Seed your first partners

Once the migration runs, you can pre-register partners so their stats
get a friendly display name + commission rate:

```sql
insert into public.referral_partners (ref_code, display_name, channel, commission_pct, notes)
values
  ('tinahuang',  'Tina Huang',          'youtube', 30, 'FAANG data scientist, 700k+'),
  ('alex',       'Alex The Analyst',    'youtube', 30, 'Analytics audience, 600k+'),
  ('luke',       'Luke Barousse',       'youtube', 30, 'Data career, 500k+'),
  ('kodluyoruz', 'Kodluyoruz',          'bootcamp', 30, 'Turkish bootcamp partner')
on conflict (ref_code) do nothing;
```

Unregistered ref_codes still get tracked — they just show up with
`unregistered` in the partner column. Add them to the directory whenever
convenient.

---

## How the funnel works end-to-end

1. **Click**: `sqlquest.app/?ref=tinahuang` — module-load block in
   `src/app.jsx` captures the ref, persists to `localStorage`, fires a
   `click` event to `track-referral`. URL is stripped clean for sharing.

2. **Signup**: User creates an account. `saveUserData` detects the fresh
   `createdAt` (< 60s old) and stamps `userData.refCode` from
   localStorage. Fires a `signup` event. Attribution window: 30 days
   (`isReferrerFresh` in `src/utils/referrals.js`).

3. **Pro conversion**: User upgrades. Stripe webhook activates Pro,
   then reads `userData.refCode` and writes a `pro_conversion` row with
   `amount_cents` and `plan_type`.

4. **Dashboard**: Open the in-app admin panel (`?admin=true` or
   Ctrl+Shift+A → password `adminadmin`), click the **💸 Referrals**
   tab, enter the `REFERRALS_ADMIN_PASSWORD`, view per-partner clicks,
   signups, conversions, revenue, commission owed.

## Sharing partner links

Tell each partner to share `https://sqlquest.app/?ref=<their_code>` —
that's the entire URL contract. Combine with other params freely:

- `https://sqlquest.app/?ref=tinahuang&lang=tr` (Turkish CTAs)
- `https://sqlquest.app/?ref=alex&challenge=mom-customer-growth` (deep
  link to a specific challenge)
- `https://sqlquest.app/after-the-sql-course/?ref=mosh` (variant landing
  with attribution)

The query-string capture happens at module load on every page, so any
entry point works.

## Test

Once deployed, smoke-test the funnel:

1. Open an incognito window, visit `https://sqlquest.app/?ref=test_partner`
2. Check `localStorage`: `sqlquest_referrer` should be `test_partner`
3. Run this in the SQL editor:
   ```sql
   select * from referrals where ref_code = 'test_partner' order by created_at desc limit 5;
   ```
   You should see one `click` row.
4. Sign up a guest → upgrade to Pro (use a 100% promo code if you have
   one to avoid charging yourself). Re-run the query — you should see
   `signup` and `pro_conversion` rows.
5. Open the **💸 Referrals** admin tab and confirm the row appears.

## What's not in v1 (deferred)

- **Renewal MRR**: only initial purchase counts as conversion. Renewals
  via `invoice.payment_succeeded` aren't logged. If we end up with
  monthly partners, add a `pro_renewal` event later.
- **Commission payouts**: dashboard shows commission owed, but actual
  payment is manual (Wise / bank transfer). No automation yet.
- **Custom co-branded landing pages** (`/tinahuang`): current setup
  routes everything through query params, which is enough for v1.
- **Self-service partner signup**: partners are added by you via SQL.
  No public signup form.

These are all clean v2 work once we have data on whether anyone
actually shares links.
