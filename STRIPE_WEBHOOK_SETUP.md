# Stripe Webhook Setup Guide for SQL Quest

This guide explains how to set up automatic Pro activation when users pay via Stripe.

## Overview

When a user pays:
1. Stripe sends a webhook to your server
2. Your server verifies the payment and identifies the user
3. The user's Pro status is updated in Supabase
4. The app automatically reflects their Pro status

---

## Step 1: Set Up Supabase Database

Run this SQL in your Supabase SQL Editor:

```sql
-- Create pending_subscriptions table for edge cases
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  username TEXT,
  plan_type TEXT NOT NULL,
  expiry TIMESTAMPTZ NOT NULL,
  stripe_session_id TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_pending_claimed ON pending_subscriptions(claimed);
```

---

## Step 2: Deploy Supabase Edge Function

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Login and Link Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.3 Set Secrets

Get your Stripe keys from https://dashboard.stripe.com/apikeys

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 2.4 Deploy the Function

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

Your webhook URL will be:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

---

## Step 3: Configure Stripe Webhook

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed` (required)
   - `invoice.payment_succeeded` (for recurring payments)
   - `customer.subscription.deleted` (for cancellations)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Supabase secrets:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

---

## Step 4: Update Product/Price IDs (Optional)

In the Edge Function, update the price/product mappings:

```typescript
const PRICE_TO_PLAN = {
  "price_xxx_monthly": { type: "monthly", durationDays: 30 },
  "price_xxx_annual": { type: "annual", durationDays: 365 },
  "price_xxx_lifetime": { type: "lifetime", durationDays: 36500 },
};
```

Get these IDs from Stripe Dashboard → Products → Click product → Copy Price ID

---

## Step 5: Test the Integration

### Test Mode

1. Use Stripe test mode (toggle in dashboard)
2. Use test card: `4242 4242 4242 4242`
3. Any future date, any CVC

### Test the Webhook

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to your function
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

---

## How It Works

### Payment Flow

```
User clicks "Upgrade to Pro"
    ↓
Opens Stripe Checkout with prefilled email & username
    ↓
User completes payment
    ↓
Stripe sends webhook to Edge Function
    ↓
Edge Function:
  1. Verifies webhook signature
  2. Identifies user by email/username
  3. Updates user.data.proStatus in Supabase
    ↓
User refreshes or clicks "Refresh Pro Status"
    ↓
App loads updated Pro status from Supabase
```

### Edge Cases Handled

| Scenario | Solution |
|----------|----------|
| User pays before signing up | Payment stored in `pending_subscriptions`, claimed on signup |
| Webhook arrives before app checks | "Refresh Pro Status" button |
| Subscription renewal | `invoice.payment_succeeded` extends expiry |
| Subscription cancelled | `customer.subscription.deleted` disables auto-renew |

---

## Troubleshooting

### Payment succeeded but Pro not activated

1. Check Supabase logs: Dashboard → Edge Functions → Logs
2. Check Stripe webhook logs: Dashboard → Developers → Webhooks → Click endpoint → Logs
3. Verify the user's email matches in Supabase

### Webhook signature invalid

1. Make sure `STRIPE_WEBHOOK_SECRET` is set correctly
2. Use the signing secret from the specific webhook endpoint

### Function not receiving webhooks

1. Verify the URL is correct
2. Check if function is deployed: `supabase functions list`
3. Test with Stripe CLI: `stripe listen --forward-to YOUR_URL`

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/stripe-webhook/index.ts` | Webhook handler |
| `supabase/migrations/001_pending_subscriptions.sql` | Database table |
| `app.jsx` | Frontend integration |

---

## Going Live

1. Switch Stripe to live mode
2. Update secrets with live keys:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
3. Create a new webhook endpoint for production
4. Test with a real payment (you can refund yourself)
