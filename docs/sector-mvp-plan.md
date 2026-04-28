# Sector MVP — Implementation Plan

> **Status:** Draft, awaiting Can's read-through. Greenlit on 2026-04-28.
> **Owner:** Claude codes, Can reviews.
> **Appetite:** 1-2 weeks (Phase 1). Phase 2 (sector schemas, B2B) is deferred.

---

## 1. Why this exists

Can runs 1-on-1 SQL tutoring on the side. Four paying customers — Elena
(8yr banker, on career break, finance examples), Murat (Siemens UK,
manager-mandated SQL, manufacturing/IoT), Colin (CS student, exam prep),
Saida (real estate analytics) — independently asked for the same thing:
**"give me my sector's data, my sector's problems, my sector's
patterns."**

Generic SQL platforms (DataLemur, DataCamp, LeetCode) treat SQL as
universal. SQL Quest's positioning shifts to:

> "The SQL platform that learns YOUR career goal and teaches you the
> patterns that matter for YOUR job."

This is a positioning pivot, not just a feature. Implications cascade
into marketing copy, affiliate partner profiles, pricing power, and
eventual B2B (companies pay for sector-specific analyst training).

---

## 2. The three layers

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: AI Mentor (goal discovery)                │
│  Conversational onboarding. 3 questions. Extract    │
│  sector + role + motivation + experience + target.  │
│  Skippable. Stores to userData.goals + Supabase.    │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: Sector Tagging (content routing)          │
│  Existing 245 challenges get sector[] tags via LLM  │
│  pipeline. Coach prioritizes user's sector. AI      │
│  Tutor injects sector context into examples.        │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Layer 3: Soft UI (personalization signals)         │
│  "Personalized for finans" badge in Coach. Sector   │
│  landing pages (/finans-sql etc). Opt-in pop-up     │
│  for existing users. No forced UI.                  │
└─────────────────────────────────────────────────────┘
```

**The flywheel underneath:** Every goal recorded → Supabase. Weekly
digest reveals sector demand reality. Roadmap input is data, not
guesswork. Six months in: "42% finans, 18% e-ticaret, 11% sağlık —
sağlık underserved" is a roadmap insight no competitor has.

---

## 3. MVP scope (Phase 1)

**In:**
- 3 sectors: **finans & banka**, **e-ticaret**, **gayrimenkul (real estate)**
- Conversational AI mentor onboarding (3 questions, skippable)
- Tag existing 245 challenges with sector metadata
- Coach prioritizes user's sector first, falls back to generic
- AI Tutor reads `userData.goals.sector` into system prompt
- 3 sector-specific landing pages (template: `/turkce-sql-ogren`)
- Soft "Personalized for [sector]" badge in Coach tab
- Supabase `user_goals` table + capture endpoint
- Free Pro initially — collect data before pricing decision

**Out (Phase 2):**
- Sector-specific schemas (real banking schema, real estate schema, etc.)
- New challenge content authored for sectors
- Premium tier / pricing changes
- B2B page / "Train your team" lead form
- Public profile goal display (default private; opt-in share comes later)

---

## 4. Architecture

### 4.1 `userData.goals` shape

```typescript
userData.goals = {
  sector: "finans" | "e-ticaret" | "gayrimenkul" | "generic" | null,
  role: string | null,           // e.g. "junior_analyst", "career_changer"
  motivation: string | null,     // e.g. "interview", "current_job", "curiosity"
  experience: "beginner" | "intermediate" | "advanced" | null,
  target: string | null,         // e.g. "FAANG", "local_bank", "promotion"
  raw_text: string,              // verbatim user answers, for future re-parse
  inferred_at: ISOTimestamp,
  ai_confidence: 0..1,           // how sure the LLM was
  user_confirmed: boolean,       // did user explicitly confirm/correct?
}
```

Defaults: all `null`. Sector defaults to `"generic"` for users who skip
onboarding. `goals` is `null` for legacy users until they trigger the
opt-in pop-up.

### 4.2 Coach engine extension

`src/utils/coach.js → computeNextStep`:

```javascript
// New step: after picking the candidate pool by skill+difficulty,
// re-rank by sector match. Pure function, no breaking change.
function prioritizeBySector(candidates, userGoals) {
  if (!userGoals?.sector || userGoals.sector === 'generic') return candidates;
  const sectorMatches = candidates.filter(c =>
    c.sectorTags?.includes(userGoals.sector)
  );
  const others = candidates.filter(c =>
    !c.sectorTags?.includes(userGoals.sector)
  );
  return [...sectorMatches, ...others];  // sector-first, fall back to all
}
```

Insertion point: inside existing `computeNextStep` after the
skill-and-difficulty filter, before the final pick. Tested in
`tests/coach.test.js` with new test cases.

### 4.3 AI Tutor sector context

`src/app.jsx` (existing AI Tutor edge function call): add a single line
to the system prompt when `userData.goals?.sector` is set:

```
The user works in [sector] (e.g. "finans & banka"). When you generate
example queries or analogies, prefer [sector]-relevant data: e.g. for
finans use accounts/transactions/customers; for gayrimenkul use
properties/listings/agents; for e-ticaret use orders/products/customers.
Don't force it — if the user asks a generic question, answer generically.
```

This is the cheapest, highest-leverage change. Zero new content cost.

### 4.4 Supabase: `user_goals` table

```sql
create table if not exists public.user_goals (
  id              bigserial primary key,
  user_handle     text,                 -- if logged in; nullable for guests
  device_id       text not null,        -- localStorage uuid fallback
  sector          text,
  role            text,
  motivation      text,
  experience      text,
  target          text,
  raw_text        text not null,
  ai_confidence   real,
  user_confirmed  boolean default false,
  inferred_at     timestamptz not null default now(),
  app_version     text,
  language        text                  -- 'tr' or 'en'
);

create index if not exists user_goals_sector_idx
  on public.user_goals (sector, inferred_at desc);
create index if not exists user_goals_handle_idx
  on public.user_goals (user_handle, inferred_at desc);

alter table public.user_goals enable row level security;
-- No public read. Only service role inserts via edge function.
-- No SELECT policy → anon cannot read. Admin reads via dashboard.
```

Edge function: `supabase/functions/capture-goal/index.ts` — POST,
validates payload shape, inserts row. Idempotent on `(device_id,
inferred_at)` to prevent double-submit.

Admin digest function: `supabase/functions/goals-summary/index.ts` —
gated by `REFERRALS_ADMIN_PASSWORD` (reuse the existing admin password,
no new credential needed). Returns sector breakdown, top roles, top
motivations for a given date range.

---

## 5. AI Mentor UX

### 5.1 Trigger points

- **New user:** First time Coach tab opens after signup, conversational
  welcome appears inline (not a modal — that's friction).
- **Existing user:** One-time pop-up on next session: *"Sana özel
  öneriler verebilmem için 30 saniyemi ayırır mısın?"* with
  Skip / Start buttons. Dismissed once = never shown again
  (`userData.goalsPromptDismissedAt`).

### 5.2 The conversation (Turkish — TR market priority)

```
Selam! Ben senin SQL koçun. Hızlıca tanışalım.

Soru 1/3: SQL öğrenmek istemenin asıl nedeni ne?
(İş, mülakat, mevcut işinde gelişme, merak — kısa yaz yeter.)
```

User answers in free text. AI parses → infers sector candidate, role
candidate. If sector is ambiguous, follow-up clarifies in Q2:

```
Anladım. Günlük işinde ne tür veriyle uğraşıyorsun ya da uğraşmak
istiyorsun?
(Müşteri, ürün, finansal işlemler, sensör verisi, gayrimenkul,
akademik...)
```

Q3 (only if conversation flows naturally — AI decides):

```
Son bir şey — 6 ay sonra hangi noktada olmak istiyorsun?
```

After Q3, AI returns a structured wrap-up:

```
Anladım. Senin için Coach'u finans sektörüne göre ayarlıyorum.
Mülakat hazırlığı odaklı. Yanlış anladıysam değiştirebilirsin.

[Onaylıyorum] [Düzelt]
```

Click "Onaylıyorum" → `userData.goals.user_confirmed = true`. "Düzelt"
opens an edit form with sector dropdown + free-text role/target.

**English version:** same flow, EN copy. Branch on `userData.lang`.

### 5.3 Implementation: reuse AI Tutor backend

The existing AI Tutor edge function (`supabase/functions/ai-tutor`)
takes a `messages[]` array + system prompt. We add a new `mode:
"goal_discovery"` parameter that swaps the system prompt to a goal-
discovery persona and asks the LLM to return JSON at the end.

The frontend's onboarding component renders a simplified chat UI
(reuses existing `<AITutorChat>` styles), with a "Skip" button always
visible. After the LLM signals end-of-conversation (returns the JSON
block), the frontend extracts and writes to `userData.goals`.

JSON schema the LLM returns:

```json
{
  "extracted": {
    "sector": "finans",
    "role": "career_changer",
    "motivation": "interview",
    "experience": "intermediate",
    "target": "FAANG_or_local_bank"
  },
  "confidence": 0.78,
  "summary_for_user": "Anladım. Senin için Coach'u finans sektörüne göre ayarlıyorum. Mülakat hazırlığı odaklı."
}
```

---

## 6. Sector tagging pipeline

Goal: each of the 245 challenges in `src/data/challenges.js` gets a
`sectorTags: string[]` field. A challenge can match multiple sectors
(e.g. "top customers by revenue" fits e-ticaret AND finans).

### 6.1 Auto-tagging (Day 3-4)

One-time script: `scripts/tag-challenges-by-sector.js`. For each
challenge, sends title + description + schema to a fast LLM (Haiku
or equivalent) with a prompt like:

```
You are tagging SQL challenges by industry sector. Pick zero or more
of: ["finans", "e-ticaret", "gayrimenkul", "telekom", "uretim",
"saglik", "saas", "media", "generic"]. Return JSON array. "generic"
means it fits any sector equally well.
```

Output: a tag map written to `src/data/sector-tags.json`. The script
is re-runnable; re-running with new sectors only adds tags, doesn't
drop existing ones.

### 6.2 Manual review (Day 4)

Open the generated tags. Eyeball ~10% sample for correctness. Fix
mistagged outliers. The 245-row exercise takes ~30 minutes.

### 6.3 Wiring into the app

`src/data/challenges.js` reads `sector-tags.json` at module init and
merges `sectorTags` into each challenge object. No DB migration —
this is build-time data.

---

## 7. Sector landing pages

Three new static HTML pages, copying `/turkce-sql-ogren` template:

- `/finans-sql/index.html` — "Finans sektöründe SQL: pattern'lar, mülakat hazırlığı"
- `/e-ticaret-sql/index.html` — "E-ticaret SQL: cohort retention, sepet analizi, top-N"
- `/gayrimenkul-sql/index.html` — "Gayrimenkul verisi ile SQL: listings, agents, transactions"

Each page:
- Hero with sector-specific copy
- 3-5 example challenges from that sector (deep links to `/?challenge=...`)
- Coach screenshot mock
- CTA → signup with `?ref=lp_[sector]` for attribution
- FAQ adapted to sector concerns

`vite.config.js` gets three new HTML inputs. Build outputs go to
`public/finans-sql/`, etc.

Sitemap + structured data updated.

---

## 8. Implementation timeline

### Day 1-2: Schema & AI mentor flow
- [ ] Add `userData.goals` shape, defaults, persistence in
  `src/app.jsx` (alongside existing userData fields)
- [ ] Build conversational onboarding component (reuse AI Tutor styles)
- [ ] Wire trigger: new user first Coach open
- [ ] Wire trigger: existing user opt-in pop-up (with dismiss memory)
- [ ] AI Tutor edge function: add `mode: "goal_discovery"` system prompt
- [ ] LLM returns JSON wrap-up block; frontend parses + stores

### Day 2-3: Supabase plumbing
- [ ] Migration SQL for `user_goals` table (file: `supabase/migrations/...`)
- [ ] Deploy `capture-goal` edge function (POST, idempotent insert)
- [ ] Frontend: fire `capture-goal` on goal save (best-effort, never blocks)
- [ ] Deploy `goals-summary` edge function (admin-gated weekly digest)

### Day 3-4: Sector tagging
- [ ] Write `scripts/tag-challenges-by-sector.js`
- [ ] Run pipeline → `src/data/sector-tags.json`
- [ ] Manual review of ~10% sample
- [ ] Wire `sectorTags` into challenge objects at module init
- [ ] Update `src/utils/coach.js` with `prioritizeBySector` step
- [ ] Tests: `tests/coach.test.js` adds 4-6 sector cases
- [ ] AI Tutor system prompt: read `userData.goals.sector`, inject
  sector context line

### Day 5-6: Landing pages & soft UI
- [ ] `public/finans-sql/index.html`
- [ ] `public/e-ticaret-sql/index.html`
- [ ] `public/gayrimenkul-sql/index.html`
- [ ] `vite.config.js` HTML inputs
- [ ] Sitemap + structured data
- [ ] Coach tab: "Personalized for [sector]" badge (small, subtle)
- [ ] Goals edit modal (Düzelt button → form)

### Day 7: Smoke test & telemetry
- [ ] `scripts/smoke-test.js` extended: simulate goal flow
- [ ] Manual end-to-end: signup → onboarding → Coach personalization → AI Tutor sector example
- [ ] Verify Supabase row appears
- [ ] Verify admin digest endpoint returns expected shape

### Week 2: Iteration
- [ ] Real user behavior monitoring
- [ ] AI mentor question quality tweaks based on actual answers
- [ ] Bug fixes
- [ ] Decide on Phase 2 priorities based on first week's goal data

---

## 9. Files touched

**New files:**
- `docs/sector-mvp-plan.md` (this file)
- `src/data/sector-tags.json` (generated)
- `src/data/sectors.js` (canonical sector list + display names)
- `scripts/tag-challenges-by-sector.js` (one-time tagger)
- `supabase/functions/capture-goal/index.ts`
- `supabase/functions/goals-summary/index.ts`
- `supabase/migrations/<timestamp>_user_goals.sql`
- `public/finans-sql/index.html`
- `public/e-ticaret-sql/index.html`
- `public/gayrimenkul-sql/index.html`

**Modified files:**
- `src/app.jsx` — userData.goals, onboarding component, trigger logic, badge UI, AI Tutor system-prompt augmentation
- `src/utils/coach.js` — `prioritizeBySector` step
- `src/data/challenges.js` — merge sectorTags from json
- `supabase/functions/ai-tutor/index.ts` — `mode: "goal_discovery"` branch
- `tests/coach.test.js` — sector prioritization test cases
- `vite.config.js` — new HTML inputs
- `public/sitemap.xml` — three new URLs
- `CLAUDE.md` — add note about sector MVP being shipped

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| **AI mentor feels intrusive** → user skips, never returns | Keep it 3 questions, conversational not bureaucratic, skip always visible. Track skip rate; if >70% skip, redesign before iterating. |
| **Sector tags are wrong** → user gets bad recommendations | Auto-tag is starting point, manual review catches obvious mistakes. Goal data later tells us which tags drive engagement vs. churn. |
| **AI Tutor sector context inflates token cost** | One extra paragraph per request. Negligible at current scale. Re-evaluate at 10x usage. |
| **3 sectors are wrong choice** → demand is elsewhere | That's exactly why we collect goal data. Bias in initial picks is corrected by Week 4 digest. |
| **Sector landing pages cannibalize SEO of main page** | Each page targets distinct keywords (`finans sql`, `e-ticaret sql`). Different long-tail. Should add traffic, not split it. |
| **Schema authenticity** (deferred to Phase 2 anyway) | Phase 1 uses generic schemas. Phase 2 will use sector-specific schemas with domain expert review. |
| **Goal data leaks PII** | `raw_text` may contain personal info. Don't expose `user_goals` table publicly. RLS denies anon reads. Admin-only. Eventually offer user-side delete. |

---

## 11. Success metrics (first 4 weeks post-launch)

| Metric | Target | How to measure |
|--------|--------|----------------|
| **Onboarding completion rate** | >40% of new users complete all 3 questions | Onboarding telemetry |
| **Skip rate** | <60% (if higher, UX needs rework) | Onboarding telemetry |
| **Sector distribution** | At least 30 goals captured per sector | `goals-summary` digest |
| **Sector challenge engagement** | Sector-tagged users solve more challenges per session vs. generic users | Coach activity logs |
| **Sector landing page conversion** | At least 1 signup per landing page per week | Existing `landing_view` + signup analytics |
| **AI Tutor sector usage** | Sector context appears in >50% of AI Tutor calls for opted-in users | Edge function logs |

If sector-tagged users show even +10% engagement vs. generic, that's
strong validation to go to Phase 2 (sector schemas).

---

## 12. Open questions (low priority, decide during implementation)

1. **AI mentor model:** Haiku (fast, cheap, decent extraction) vs.
   Sonnet (smarter, costlier). Default Haiku; fall back to Sonnet if
   confidence <0.6.
2. **Sector list i18n:** Display names per language. `sectors.js` will
   have `{ id: "finans", tr: "Finans & Banka", en: "Finance & Banking" }`.
3. **Edit-after-confirm UX:** Where does the "edit goals" button live?
   Probably under Coach tab settings, not main nav. Confirm during impl.
4. **Generic users:** Should we still show a "switch to a sector?"
   nudge after they solve N challenges? Probably yes, but not in MVP.

---

## 13. Phase 2 (deferred — do NOT build now)

These are intentional cuts from MVP. Build only after Phase 1 produces
data validating the bet.

- **Sector-specific schemas.** Real bank-style accounts/transactions,
  real estate listings/agents/transactions, e-com orders/products. Each
  schema needs ~20 challenges. Authentic enough to not insult domain
  pros. Requires domain expert review pass.
- **Premium tier.** $29/mo "Career Pro" with sector schemas + priority
  AI. Decide after seeing 3 months of free Pro data.
- **B2B page.** `/teams` lead capture. "Train your analyst team in
  [sector]." Aimed at companies like Murat's Siemens, banks' L&D budgets.
- **Public profile sector display.** Opt-in. "Hedef: Finans sektörüne
  geçiş" badge on `/u/:handle`. Skipped in MVP per Can's preference for
  default-private goal data.
- **Sector-aware affiliate program.** Recruit niche sector influencers
  (banker → finans, real estate analyst → gayrimenkul). Tie into
  existing affiliate infrastructure with `sector` partner attribute.
- **More sectors.** Telekom, üretim, sağlık, akademi after data shows
  demand. Don't add proactively — let users tell us.

---

## 14. Decision log

- **2026-04-28** Greenlit by Can after strategy discussion. 3 sectors
  picked: finans, e-ticaret, gayrimenkul. Triggers: (a) new-user
  onboarding + (c) opt-in pop-up for existing. Default-private goal
  data. MVP free Pro; pricing decision deferred to post-data.
- **2026-04-28** Sector pivot framing borrowed from Can's tutoring
  case studies (Elena/Murat/Colin/Saida). Validates demand more than
  any focus group could.
