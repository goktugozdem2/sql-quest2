# Real-Time Interview Helper — Design Spec

**Status:** Design rev 1 — pending author approval then implementation plan.
**Author:** Design brainstorm 2026-05-04
**Target:** A cross-platform desktop app that gives candidates real-time AI assistance during live video interviews. Invisible during screen-share. Specialized — in marketing — for data roles, leveraging the SQL Quest founder's existing audience and SQL domain credibility. Sold as a separate brand, distributed direct.

---

## Problem

In 2026 there is a category of products (Cluely, Interview Coder, Parakeet AI) that help interview candidates pass live remote interviews using AI assistance the interviewer can't see. The market is real and growing: Parakeet's $29.50–$88.50 credit packs sell, Cluely raised $5M, Interview Coder is in YC. Existing tools have three weaknesses we can exploit:

1. **Generic-purpose AI brain** — they use vanilla GPT/Claude with no verification step. Hard SQL questions wrong ~25% of the time.
2. **Soft stealth** — most ship Tier 1 (window content protection only). Already detectable by Zoom 6.x's beta AI-assistant detection and by sharp interviewers running screen-share-during-share traps.
3. **Subscription-shaped pricing** — encourages cancellation, mismatched with the user's actual job-search timeline.

The author already operates SQL Quest (~100k users, strong data-role credibility, ~125 SQL challenges, schema-aware sandbox already in production). That brand is preserved; this is a separate product to capture interview-day spend from the same audience and the wider data-role candidate pool.

## Goal

Ship a v1 desktop app in ~17 weeks that does, in order of priority:

1. **Won't get caught.** Stealth Tier 2 from day one with Tier 3 architecture readiness for rolling counter-detection patches.
2. **Better answers than Cluely on data questions.** Sandbox SQL round-trip is the accuracy moat — AI's proposed query is run against schema parsed off-screen before being shown.
3. **Pricing matched to job-search reality.** Credit packs that don't expire + a monthly fallback + lifetime upsell. 10-min free trial wedge against Parakeet's no-trial.

## Non-goals (v1)

- Tier-C "auto-type into editor" autosolver — too detectable, will get users caught.
- Fine-tuned model — modern LLMs are good enough at SQL with a strong system prompt.
- RAG over SQL Quest content — distribution edge is the existing audience, not technical specialization.
- App Store distribution — Apple, Microsoft, and Google have all banned interview-helper tools. Direct download only.
- SQL Quest co-branding — separate brand to insulate SQL Quest's "study aid" reputation.
- Storing question or answer text server-side, ever — privacy commitment is load-bearing for trust.
- Linux build, mobile companion, browser-extension companion, B2B/SSO, practice mode (that's SQL Quest's lane).

---

## Locked-in decisions (from brainstorm)

| # | Decision | Choice |
|---|---|---|
| 1 | Platform | Cross-platform Electron with content protection (`setContentProtection` on macOS, `WDA_EXCLUDEFROMCAPTURE` on Windows) |
| 2 | Question modality | All interview types (coding, behavioral, case, system design); data specialty in marketing only |
| 3 | Input modes | Screen capture + microphone + system audio loopback (CATap on macOS 14.4+, WASAPI on Windows) |
| 4 | Aggressiveness tier | Tier A — subtle overlay; candidate reads and types themselves |
| 5 | AI brain | Multi-provider router (Claude / GPT-5 / Gemini); no fine-tuning; schema-aware sandbox SQL execution baked in |
| 6 | Distribution | Standalone, separate brand (final name TBD; cross-promo banner inside SQL Quest is acceptable but no co-branding) |
| 7 | Brand voice | "AI interview superpowers" (Cluely lane). Lean into controversy. Salary-negotiation hook: "$99 once → $15k raise." |
| 8 | Stealth depth | Tier 2 in v1 (content protection + process hardening + audio safeguards + kill-switch). Tier 3 architecture-ready for rolling counter-detection. |
| 9 | Pricing | 10 min free / Starter $29 (3 cr) / Plus $59 (8 cr) / Power $89 (15 cr) / Monthly $39 / Lifetime $249. 1 credit = 60 min, 0.5 credit per 30-min session. Credits never expire. 30-day money-back. |

---

## System architecture

Three tiers — desktop client, cloud backend, external AI providers.

### Client (Electron app on candidate's machine)

- **Overlay window** — frameless, transparent, content-protected, always-on-top, React-rendered.
- **Capture engine** — screen (`desktopCapturer`) + mic (`getUserMedia`) + system audio (platform-specific). 60s ring buffers for both audio streams.
- **Hotkey listener** — global shortcuts via `globalShortcut`: trigger answer, toggle visibility, move overlay, kill-switch, re-roll provider.
- **Sandbox SQL runner** — `sql.js` (~600KB wasm) in renderer. Parses schema visible on screen, runs the AI's proposed query, returns result/error to AI for self-correction.
- **Auto-updater** — `electron-updater` against own CDN feed (App Store distribution rejected by all stores for this category).
- **Stack:** Electron 30+, React 18, Tailwind, `sql.js`, `node-mac-permissions`.

### Backend (Cloud — Supabase Edge Functions + Postgres)

- **Auth + billing API** — Supabase Auth (email/password); long-lived refresh JWT for desktop.
- **Credit ledger** — `users`, `credit_balances`, `credit_txns`, `sessions` tables. `credit_txns` is source of truth; `credit_balances` is denormalized.
- **LLM router service** — server-side proxy hides provider keys, classifies questions, routes by type, parallel-launches a backup if primary > 800ms.
- **Stripe + Paddle webhooks** — Stripe primary, Paddle wired-but-dormant for processor-shutdown resilience.
- **Update server** — signed manifests on Cloudflare R2, channels (stable/beta), forced-update flag for stealth hotpatches.

### External providers

- **Anthropic Claude 4.7 Sonnet** — default for SQL/code, with tool use for the sandbox round-trip.
- **OpenAI GPT-5** — fallback + behavioral/case questions (more natural-sounding talking points).
- **Google Gemini 2.5 Flash** — fast vision OCR for schema/screen reading.
- **Deepgram Nova-3** — streaming audio transcription, <300ms latency.
- **ElevenLabs** — deferred to v1.5 (Tier-B TTS-to-AirPods).

### Why these splits matter

- **LLM router on backend, not client** — keeps API keys server-side, lets us swap providers without forcing app updates, enables central cost tracking.
- **Sandbox SQL runner on client** — no server round-trip per attempt; the AI proposes, client runs in <100ms, AI sees result and self-corrects in the same turn. Accuracy moat vs. Cluely.
- **Update server on own CDN** — App Store distribution is not on the table for this product category.
- **Two payment processors from day one** — Stripe has shut down accounts in this category twice (Cluely). Paddle as redundancy means we can keep selling through processor incidents.

---

## Client deep-dive

### Overlay UI states

1. **Idle** — small pill, bottom-right, 10% opacity, doesn't draw the eye.
2. **Listening / thinking** — pulse animation on hotkey trigger or auto-detect. Brief status, no partial answer leakage.
3. **Answer shown** — expanded card with answer + provider badge + latency. Drag-anywhere reposition. `Esc` to dismiss back to idle.

### Stealth (Tier 2)

| Concern | macOS | Windows |
|---|---|---|
| Excluded from screen capture | `setContentProtection(true)` + `NSWindow.sharingType=.none` | `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` |
| Hidden from cmd-tab / taskbar | `LSUIElement: true` in Info.plist (no Dock icon) | `WS_EX_TOOLWINDOW` extended style |
| Innocuous process name | Bundle ID + exec name set to neutral strings (e.g., `SystemHelper`) at sign-time | exe rename + neutral PE metadata |
| System-audio capture | `CATapDescription` (macOS 14.4+, no kext, no admin); BlackHole bundled fallback for older OS | WASAPI loopback (built-in) |
| Always-on-top in front of Zoom | `setAlwaysOnTop(true, 'screen-saver')` | Same Electron API |
| No clipboard usage, ever | Direct DOM rendering only — avoids paste-history forensic trail. | (same) |
| No on-disk answer logs | Answers held in memory only; opt-in anonymized telemetry. | (same) |
| Kill-switch hotkey | Hold `⌘⇧⎋` 1s → wipe in-memory cache + hide window 30s. Tap → just hide. | Same with `Ctrl⇧⎋` |

### Hotkeys (configurable)

- `⌘⇧\` — Trigger answer for current context
- `⌘⇧H` — Toggle overlay visibility
- `⌘⇧↑/↓` — Move overlay up/down
- `⌘⇧⎋` — Kill switch (tap = hide, hold = wipe + hide 30s)
- `⌘⇧A` — Re-ask with different provider

### Capture engine

- **Screen** — `desktopCapturer` grabs focused display every 2s OR on hotkey. Vision-capable LLM ingests directly (no OCR step).
- **Mic** — `getUserMedia({audio:true})`, 60s ring buffer.
- **System audio** — platform-specific (table above), 60s ring buffer.
- Two transcription streams fed to Deepgram in parallel; speaker-diarized so we know who said what.
- Capture pauses entirely while overlay is hidden by kill-switch.

### Sandbox SQL runner (the accuracy moat)

When Claude proposes SQL, the renderer parses the schema visible on screen, spins up a `sql.js` in-memory database, runs the proposed query, and pipes the result (or error) back to Claude in the same turn via tool use. Claude self-corrects on errors up to 2 iterations before showing the answer to the candidate. End-to-end target <2.5s. Open-source, runs entirely in renderer, zero infra cost.

### Auto-updater

`electron-updater` with feed on Cloudflare R2. Background download, prompt-to-restart on next idle. Code-signing mandatory: Apple Developer ID + macOS notarization, Windows EV cert for SmartScreen reputation.

---

## Backend services

### Database schema (Postgres via Supabase)

```
users
  id              uuid  PK
  email           text
  created_at      tstz
  device_fp       text     -- anti-abuse fingerprint
  trial_used      bool

credit_balances
  user_id          uuid  FK
  balance          numeric(10,3)
  unlimited_until  tstz?         -- for monthly/lifetime SKUs
  updated_at       tstz

credit_txns                       -- SOURCE OF TRUTH
  id               uuid  PK
  user_id          uuid  FK
  delta            numeric(10,3)
  reason           enum (purchase|usage|bonus|refund|grant)
  stripe_event     text?         -- idempotency key
  session_id       uuid?
  created_at       tstz

sessions
  id               uuid  PK
  user_id          uuid  FK
  started_at       tstz
  ended_at         tstz?
  credits_used     numeric(10,3)
  device           text
```

- `credit_txns` is the ledger source of truth; `credit_balances` is a denormalized view recomputed by trigger.
- `device_fp` + `trial_used` prevents the 10-min-free abuse loop.
- `unlimited_until` handles flat-rate SKUs without changing credit math (just a "is this user on flat-rate right now" check before decrementing).
- `sessions` powers the heartbeat-tick decrement: cron every 60s scans active sessions and flushes incremental usage.

### API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Email/password signup; granted 10-min trial credit if device unseen |
| POST | `/auth/login` | Returns access + refresh JWT |
| GET | `/me` | Profile + balance + active subscription state |
| POST | `/sessions/start` | Open a session, returns `session_id`; verifies balance > 0 |
| POST | `/sessions/heartbeat` | Every 60s; ticks 0.5 credit per 30 min elapsed |
| POST | `/sessions/end` | Final billing tick + close session |
| POST | `/llm/answer` | Routes to a provider, proxies request, returns streamed answer |
| POST | `/billing/checkout` | Creates Stripe (or Paddle) checkout session for chosen SKU |
| POST | `/billing/webhook` | Stripe/Paddle webhook receiver; writes `credit_txns` |
| GET | `/updates/:channel` | electron-updater feed; returns latest signed manifest |
| DELETE | `/me` | Hard delete account + all data (privacy commitment) |

### LLM router routing logic

Client sends `{type, context, screen_image?, transcript?}`. Router classifies and dispatches:

- **SQL / code** → Claude 4.7 Sonnet + tool use for sandbox round-trip
- **Behavioral / case** → GPT-5 (natural-sounding paragraphs in STAR format)
- **Stats / probability** → Claude 4.7 Sonnet (strongest math reasoning)
- **Schema / table reading** → Gemini 2.5 Flash (fastest + cheapest vision)
- **Audio transcription** → Deepgram Nova-3 (streaming, <300ms)
- **Hedging / fallback** — if primary > 800ms, parallel-launch backup; first response wins.

### Billing — Stripe primary, Paddle backup

Both processors integrated from day one but only Stripe is live. Paddle webhook + checkout pre-wired so a single env-var flip switches over if Stripe shuts the account down. Coinbase Commerce as tertiary fallback for users who explicitly prefer crypto — small revenue share, big trust signal.

### Telemetry — opt-in, anonymous

Off by default. If user opts in: provider used, latency, error rate, credit balance — no question text, no answer text, ever. The promise is "we don't know what you asked or what you got." One leaked DB of "what cheating questions our users asked" ends the company.

---

## The question loop

### Happy path — SQL question (~1.9s end-to-end)

| # | Step | Latency budget |
|---|---|---|
| 1 | Trigger fires (hotkey OR audio detector hears question-shaped speech) | 0 ms |
| 2 | Capture context in parallel (screenshot + last 30s audio buffer) | ~80 ms |
| 3 | Transcribe interviewer audio (Deepgram streaming) | ~250 ms |
| 4 | POST `/llm/answer` (backend classifies → Claude with screen image + transcript) | ~120 ms |
| 5 | Claude proposes SQL (vision reads schema, generates query, requests sandbox tool) | ~900 ms |
| 6 | **Sandbox round-trip** (`sql.js` runs query in renderer, result streamed back to Claude) | ~120 ms |
| 7 | Claude finalizes (or self-corrects, max 2 iterations) | ~400 ms |
| 8 | Stream answer to overlay (token-by-token, syntax highlight) | ~100 ms |
| | **End-to-end target** | **~1.9s (worst case ~2.5s with 1 self-correct)** |

### Happy path — behavioral question (~1.4s end-to-end)

| # | Step | Latency budget |
|---|---|---|
| 1 | Audio detector fires on question-shaped phrasing | 0 ms |
| 2 | Capture last 60s diarized transcript | ~80 ms |
| 3 | POST `/llm/answer` → routed to GPT-5 with STAR-format system prompt | ~120 ms |
| 4 | GPT-5 generates 3-5 bullet talking points (not paragraphs — bullets the candidate riffs on in their own voice) | ~1100 ms |
| 5 | Stream to overlay (different visual treatment from code answers) | ~100 ms |
| | **End-to-end target** | **~1.4s** |

### Activation modes

- **Auto-detect (default)** — interviewer audio continuously transcribed; small classifier flags "this is a question" and trips the loop. Tunable sensitivity.
- **Manual hotkey** — `⌘⇧\` fires the loop with current 30s context. For paranoid users or when auto-detect misfires.
- **Re-roll** — `⌘⇧A` re-asks via a different provider when the first answer feels off.

### Error handling

| Failure | Detection | Fallback |
|---|---|---|
| Provider timeout > 800ms | Per-request timer in router | Parallel-launch backup; whichever streams first wins |
| All providers down | All parallel calls timeout 5s | Overlay error: "Network hiccup — try ⌘⇧A". No credit charged. |
| Sandbox SQL errors | `sql.js` exception | Send error back to Claude same turn; max 2 self-correct iterations; if still failing, return query without verification + warning badge |
| Screen capture permission revoked | OS error from `desktopCapturer` | Degrade to audio-only mode. Settings deep-link to re-grant. SQL questions warn "no schema visible". |
| Mic permission revoked | OS error from `getUserMedia` | Degrade to screen-only mode. Manual hotkey only. |
| Credit balance hits zero mid-session | Heartbeat returns `insufficient_balance` | Non-blocking banner: "30s of free overtime, then upgrade." Hardcoded buffer, then overlay locks. |
| Network outage mid-question | `fetch()` rejects | Retry once after 800ms. If still failing, fall back to last-cached similar answer (in-memory only, 1-day). |
| Auto-update fails / corrupted | `electron-updater` error | Roll back to previous binary. Never block app launch on a failed update. |
| Stripe webhook lost | Reconciliation cron compares Stripe API truth vs. `credit_txns` nightly | Auto-credit any missing transactions. Idempotent by `stripe_event` id. |
| Kill-switch hold during answer stream | Hotkey listener intercepts | Cancel in-flight LLM request via AbortController, wipe in-memory cache, hide overlay 30s. No credit refund. |

### Cancellation rule

Any user-initiated dismissal (Esc, kill-switch, hide-toggle) cancels in-flight work via `AbortController` — both the network request and the renderer-side stream consumer. We never burn LLM tokens (= credits = real money) for an answer the user explicitly bailed on.

---

## Roadmap (~17 weeks to v1 launch)

| Phase | Weeks | Major deliverables |
|---|---|---|
| 1 — Foundation | 1–3 | Supabase schema; auth + JWT; Electron skeleton + content protection; marketing site live (waitlist); Stripe products + checkout |
| 2 — Capture & brain | 4–7 | Screen capture; mic; system audio (CATap mac, WASAPI win); Deepgram integration; LLM router (Claude + GPT-5 + Gemini); sql.js sandbox |
| 3 — UX & stealth | 8–10 | Overlay 3 states; hotkey suite; stealth Tier 2 (LSUIElement, taskbar hide, process rename); kill-switch + cache wipe; auto-updater on R2 |
| 4 — Billing & polish | 11–13 | Heartbeat credit ticking; all 5 SKUs; Paddle wired (dormant); free-trial fingerprinting; refund flow + reconciliation cron; notarization + EV cert signing |
| 5 — Beta & launch | 14–17 | Closed beta (50 invitees from SQL Quest list); stealth verification on Zoom/Meet/Teams; latency tuning (target <2s); bug-bash; viral launch (Twitter, Reddit r/cscareerquestions, ProductHunt) |

---

## Testing strategy

| Layer | What we test | How |
|---|---|---|
| Unit | Credit math (decimals, rounding, idempotency); LLM router classifier; sandbox SQL parser | Vitest, ~80% coverage on pure functions |
| Integration | Question-loop end-to-end with mock LLM responses, real sandbox, real audio fixtures | Playwright running Electron headlessly |
| Stealth verification | Pixels excluded from Zoom/Meet/Teams capture; window absent from Mission Control / Alt-Tab; process name innocuous in Activity Monitor | Manual matrix every release across 4 conferencing apps × 2 OSes. Recorded as videos for marketing too. |
| Latency benchmarks | End-to-end question loop p50 < 2s, p95 < 3.5s on residential wifi | Continuous benchmark against staging from CI on every merge to `main` |
| Beta cohort | Real-world interview accuracy; false-trigger rate on auto-detect; "did you get caught" survey | 50 invitees from SQL Quest list, anonymous post-interview form, 6-week beta |
| Stealth regression | When Zoom/Meet ships an update, verify content-protection still holds | Cron: nightly headless capture of overlay against current Zoom build, fail loudly if pixels leak |

## Definition of done for v1

- 50-invitee beta cohort completes 100+ real interviews using the tool
- < 5% report being caught (self-reported) AND zero visual leaks observed in stealth-regression CI
- p50 end-to-end < 2s, p95 < 3.5s sustained for 7 days
- Stripe checkout converts ≥ 30% of free-trial users to a paid SKU
- Reconciliation cron has zero unmatched transactions across the cohort
- Auto-updater rolls out cleanly to all beta users with zero hard failures

---

## Open questions for implementation planning

These are decisions deferred to the writing-plans phase:

1. **Code-signing identity.** Apple Developer ID and Windows EV cert under what entity name? Recommendation: separate LLC for liability isolation from SQL Quest, but legal counsel needed before incorporation.
2. **Marketing brand name.** Must be picked before week 3 of the foundation phase so domains, certs, and store registrations can land in time. Brainstorm separately.
3. **System-audio fallback strategy** for macOS < 14.4 (~15% of target candidate machines as of mid-2026). Bundle BlackHole installer or refuse install on older OS? Affects beta-cohort selection criteria.
4. **Auto-detect classifier.** Hand-rolled heuristic on transcript ("ends with question mark, contains interrogative word") or small fine-tuned BERT? Latency vs. accuracy tradeoff. v1 default: heuristic; revisit if false-trigger rate > 10% in beta.
5. **Provider cost model.** Claude tool-use rounds add tokens. Need a cost-per-question model after week 4 once real usage data exists, to validate that the credit pricing leaves a healthy gross margin.
6. **Forced-update threshold.** What constitutes a "stealth hotpatch" significant enough to push a forced update vs. a normal opt-in? Document before week 10.

---

## Appendix — competitive snapshot (for reference, not load-bearing)

| Competitor | Stealth | Brain | Pricing |
|---|---|---|---|
| Cluely | Tier 1 (content protection only) | Generic Claude/GPT, no verification | $25/mo or $200 lifetime; 7-day trial |
| Interview Coder | Tier 1 + minor process hardening | Generic Claude, no verification | $60/mo, no free trial |
| Parakeet AI | Tier 1 | Generic GPT, no verification | $29.50–$88.50 credit packs (one-time, lifetime); no free trial |
| **This product** | **Tier 2 with Tier-3-ready arch** | **Multi-provider + sandbox round-trip on SQL** | **Free 10-min trial / $29–$89 packs / $39 mo / $249 lifetime** |
