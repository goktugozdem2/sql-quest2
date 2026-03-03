# AI Tutor Proxy Setup Guide

## Overview
The AI Tutor now works through a server-side proxy instead of requiring users to bring their own API key. This means:
- **All logged-in users** get AI tutoring automatically
- **No API key setup** needed by users  
- **Rate limiting** by plan tier (Free: 10/day, Monthly: 50, Annual: 75, Lifetime: 100)
- **Your Anthropic key** stays secure on the server

## Setup Steps

### 1. Create the `ai_usage` table in Supabase

Go to **Supabase Dashboard → SQL Editor** and run the contents of `ai-usage-setup.sql`:

```sql
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INT DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(username, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(username, date);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON ai_usage
  FOR ALL USING (true);
```

### 2. Deploy the Edge Function

First, install the Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login and link your project:
```bash
supabase login
supabase link --project-ref abmgtjafghpupaqsjnwe
```

Create the function directory and copy the file:
```bash
mkdir -p supabase/functions/ai-tutor
cp ai-tutor.ts supabase/functions/ai-tutor/index.ts
```

Set your Anthropic API key as a secret:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Deploy:
```bash
supabase functions deploy ai-tutor --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function uses username-based auth (matching your existing auth system) rather than Supabase JWT auth.

### 3. Test the endpoint

```bash
curl -X POST https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/ai-tutor \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "messages": [{"role": "user", "content": "What is SELECT?"}],
    "systemPrompt": "You are a SQL tutor."
  }'
```

You should get back:
```json
{
  "text": "SELECT is a SQL command...",
  "usage": { "used": 1, "limit": 10, "plan": "free", "remaining": 9 }
}
```

### 4. Push updated app code

The app.jsx changes:
- `callAI()` now calls your Supabase Edge Function instead of Anthropic/OpenAI directly
- No API key needed — just being logged in is sufficient
- Usage tracking displayed in the UI (sidebar + header)
- Rate limit messages shown when daily limit reached
- "AI Tutor Requires API Key" screen replaced with "Sign in to use AI Tutor"

```bash
cd ~/sql-quest2
git add .
git commit -m "AI proxy: no more API keys, rate-limited by plan"
git push
```

## Cost Estimates

Using Claude 3.5 Haiku (~$0.001/call):

| Users | Free (10/day) | Monthly (50/day) | Annual (75/day) | Monthly Cost |
|-------|--------------|------------------|-----------------|-------------|
| 100   | ~$30         | ~$150            | ~$225           | ~$405       |
| 500   | ~$150        | ~$750            | ~$1,125         | ~$2,025     |
| 1000  | ~$300        | ~$1,500          | ~$2,250         | ~$4,050     |

*Worst case (all users maxing limits daily). Reality is typically 10-20% of max.*

## Files Changed

- `ai-tutor.ts` — New Edge Function (proxy + rate limiting)
- `ai-usage-setup.sql` — New database table
- `src/app.jsx` — Updated callAI(), removed API key UI, added usage tracking
