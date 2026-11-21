# Sector MVP — Deploy Steps

Code is shipped (Day 1 + Day 2). Three Supabase steps remaining (you do
these in the dashboard / CLI; I can't from here):

Background: [`docs/sector-mvp-plan.md`](./docs/sector-mvp-plan.md)

## 1. Run the migration SQL

Open the Supabase SQL editor and paste the contents of
[`user-goals-setup.sql`](./user-goals-setup.sql). Hit Run. Creates one
table (`user_goals`), four indexes, two RLS policies, and one
aggregation function (`get_goals_summary`).

The migration is idempotent — safe to re-run if anything fails halfway.

## 2. Confirm the AI Tutor secret is set

The Goals Mentor uses your existing `ai-tutor` edge function with a new
`mode: "goal_discovery"` branch. It reuses the existing `ANTHROPIC_API_KEY`
secret — no new credential needed.

```bash
supabase secrets list | grep ANTHROPIC_API_KEY
```

If it's missing (it shouldn't be — the AI Tutor wouldn't work), set it:

```bash
supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

The admin-gated `goals-summary` endpoint reuses the existing
`REFERRALS_ADMIN_PASSWORD` secret (both endpoints expose aggregate user
data; same gate applies). If you'd rather split it, set
`GOALS_ADMIN_PASSWORD` separately — the function falls back to
`REFERRALS_ADMIN_PASSWORD` if the dedicated one isn't set.

## 3. Deploy the three edge functions

```bash
supabase functions deploy ai-tutor
supabase functions deploy capture-goal
supabase functions deploy goals-summary
```

- `ai-tutor` — needs redeploy because the `goal_discovery` mode is new
- `capture-goal` — public (any anon caller can submit a confirmed goal;
  per-device rate limit + length caps applied server-side)
- `goals-summary` — gated by the admin password from step 2

---

## How the funnel works end-to-end

1. **Mentor opens**: User clicks "✨ Sektörüne göre kişiselleştir →" in
   onboarding step 3, or a marketing link with `?goals=mentor`, or the
   Coach-tab "Senin için: [sector] ✎" badge to refine.

2. **Q1 → Q2 → Q3**: User answers three short questions. Per-turn local
   keyword extractor runs immediately for instant feedback (badge
   preview).

3. **LLM refinement (after Q3)**: The frontend calls `ai-tutor` with
   `mode: "goal_discovery"`, sending the chat history. The backend
   uses a hardcoded extraction system prompt (so it can't be tampered
   with) and returns clean structured JSON: sector, role, motivation,
   experience, target, ai_confidence, summary_for_user.

4. **Wrap-up**: The mentor shows the LLM's localized summary line
   ("Anladım — Coach'u finans sektörüne göre ayarlıyorum...") plus the
   extracted-fields card.

5. **Confirm**: User clicks "Onaylıyorum". Three things happen:
   - `userData.goals` set in app state (persists via the existing
     userData save loop for logged-in users)
   - `localStorage.sqlquest_user_goals` written (guests too)
   - POST to `capture-goal` edge function → `user_goals` table row
     (best-effort; failures don't block the user)

6. **Coach badge**: Goal-section header on the Coach tab now shows
   "Senin için: 🏠 Gayrimenkul · Data Analyst ✎" — click to re-open
   the mentor and refine.

## Inspecting the data

Pull a sector breakdown over the last 30 days:

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/goals-summary" \
  -H "Content-Type: application/json" \
  -d '{"admin_password":"<REFERRALS_ADMIN_PASSWORD>","since_days":30}' \
  | jq '.rows[] | {sector,language,total_count,confirmed_count,top_role,top_motivation,top_target}'
```

Or directly in SQL editor:

```sql
select sector, count(*), max(inferred_at) as last_seen
from public.user_goals
where inferred_at > now() - interval '30 days'
  and user_confirmed = true
group by sector
order by count(*) desc;
```

Top motivations for finans users this month:

```sql
select motivation, count(*)
from public.user_goals
where sector = 'finans'
  and inferred_at > now() - interval '30 days'
  and user_confirmed = true
group by motivation
order by count(*) desc;
```

## Test

Once deployed, smoke-test the funnel in an incognito window:

1. Visit `https://sqlquest.app/?goals=mentor&lang=tr`
2. Type "Bankada veri analisti, mülakatlara hazırlanıyorum" → Send
3. "Müşteri ve transaction verisi" → Send
4. "FAANG mülakatlarını geçmek istiyorum" → Send
5. After ~1-2s, wrap-up appears with the LLM's localized summary
6. Click Onaylıyorum → modal closes
7. Run in SQL editor:
   ```sql
   select sector, role, motivation, target, ai_confidence, language, raw_text
   from public.user_goals
   order by inferred_at desc
   limit 1;
   ```
   You should see one row with sector=`finans`, role like
   `data_analyst`, motivation=`interview`, target=`FAANG`,
   confidence ≥ 0.7, language=`tr`.
8. Open the Coach tab and pick a goal — the "Senin için: 🏦 Finans &
   Banka · Data Analyst ✎" chip should appear under the goal name.

## Cost / rate limits

The Goals Mentor's LLM call is one Claude Haiku 4.5 message per
completed mentor session (only on Q3 → wrap-up transition). The
existing AI Tutor rate limits apply:

| Plan | Daily AI calls |
|------|---|
| guest | 5 |
| free | 20 |
| monthly | 50 |
| annual | 75 |
| lifetime | 100 |

If a user hits their cap mid-mentor, the LLM call returns a 429 and
the frontend silently falls back to the local keyword extractor. The
user still gets a (less polished) wrap-up. This is by design — we never
want a rate limit to block the goal capture.

`capture-goal` has its own per-device cap (5 inserts / device / 24h)
to deter spam. Anyone hitting that cap is either testing or abusing.

## What's wired but not yet visible (Day 3-7 work)

- **Coach prioritizeBySector** — challenge ordering by `userGoals.sector`
- **AI Tutor sector context** — sector-flavored examples in the chat
- **Sector landing pages** — `/finans-sql`, `/e-ticaret-sql`, `/gayrimenkul-sql`
- **245-challenge auto-tag pipeline** — `scripts/tag-challenges-by-sector.js`

Once those land, the badge promise pays off — sector users actually see
sector-themed challenges and AI Tutor examples, not just a badge.

## What's deferred (Phase 2)

- Real sector-specific schemas (banking transactions, listings, etc) —
  needs domain-expert review pass
- Premium tier ($29/mo Career Pro) — decide after data
- B2B `/teams` lead-capture page
- Public profile sector display (opt-in)
- Onboarding tour for the mentor itself
