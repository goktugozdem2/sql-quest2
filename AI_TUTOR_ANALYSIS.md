# AI Tutor - Architecture Analysis & Improvement Recommendations

## How It Works

### Architecture Overview

The AI tutor uses a **server-side proxy pattern**:

```
User (React Frontend)
  → Supabase Edge Function (ai-tutor.ts)
  → Claude API (Haiku 4.5)
  → Response + usage tracking
  → Back to UI
```

No API keys are exposed client-side. All requests are proxied through a Supabase Edge Function that handles authentication, rate limiting, and usage tracking.

### Core Flow

1. **Lesson Start** (`startAiLesson`): Loads lesson data, resets state, loads the appropriate dataset (passengers/movies/employees/ecommerce), calls Claude with an intro prompt.

2. **Phase Machine**: The tutor progresses through phases:
   ```
   intro → teaching → practice → feedback → (loop until 3 correct) → comprehension → completion
   ```
   Phase transitions are triggered by keyword matching on user input (e.g., "ready", "yes" → advance from intro to teaching).

3. **Message Handling** (`sendAiMessage`): Each user message triggers phase detection, context assembly, an API call with the full conversation history + a phase-specific system prompt, and response parsing.

4. **AI Calls** (`callAI`): Validates message format (alternating user/assistant), enriches the system prompt with student context (skill level, progress, weaknesses), sends to the edge function, and tracks usage.

5. **System Prompt** (`getAISystemPrompt`): Dynamically built per-call with: lesson metadata, table schemas, previously asked questions, hint ladder level, student answer + correct answer (for feedback), tone adjustment based on consecutive wrong attempts, and phase-specific instructions.

6. **Response Parsing**: Extracts `[EXPECTED_SQL]...[/EXPECTED_SQL]` tags from practice questions, runs the expected SQL locally to get expected results, and detects correct/incorrect by keyword matching on the AI response.

### Key Features

- **Socratic Hint Ladder** (4 levels): Concept nudge → Syntax hint → Partial scaffold → Full reveal
- **Guided Build Mode**: Step-by-step query construction when students struggle (3+ wrong attempts)
- **Adaptive Tone**: Adjusts encouragement level based on consecutive wrong answers
- **Skill Mastery Tracking**: Updates per-topic mastery based on correctness and hint usage
- **Rate Limiting**: Free (10/day), Monthly (50), Annual (75), Lifetime (100)
- **Static Fallback**: Pre-written content available when AI is unavailable

---

## Issues & Improvement Recommendations

### P0 - Critical

#### 1. Fragile Correct/Incorrect Detection via Keyword Matching
**File:** `src/app.jsx:10257-10269`

The system determines if a student answered correctly by scanning the AI response for keywords like "correct", "great job", "well done". This is extremely brittle:
- The AI could say "That's not correct" and the word "correct" would trigger a false positive
- The AI could praise effort ("Great job trying!") on a wrong answer
- Negations are not handled: "not quite correct" contains both "not quite" AND "correct"

**Recommendation:** Instead of parsing natural language, have the AI return a structured signal. Add a required tag to the feedback prompt: `[RESULT:correct]` or `[RESULT:incorrect]`. Parse that tag deterministically, then strip it from the displayed response. This is the same pattern already used for `[EXPECTED_SQL]` and would be consistent.

#### 2. Phase Transitions Based on Keyword Matching
**File:** `src/app.jsx:10157-10159`

Phase transitions rely on detecting words like "yes", "ready", "practice" in user input. Problems:
- "I'm not ready" contains "ready" → would advance the phase
- "Can you explain that practice concept again?" contains "practice" → would skip teaching
- Typos or alternative phrasing ("sure", "go ahead", "next") may not trigger transitions

**Recommendation:** Replace keyword matching with explicit UI buttons for phase transitions (some already exist as quick-action buttons). Make buttons the primary mechanism and keep keyword matching only as a secondary fallback with better negation handling (e.g., skip if preceded by "not", "don't", "no").

#### 3. Race Condition in Usage Tracking
**File:** `ai-tutor.ts:88-149`

The edge function reads usage count, checks the limit, calls Claude, then updates the count. Between the read and update, concurrent requests from the same user could both pass the limit check. With the current low daily limits this is unlikely to cause real harm, but it violates the rate limit contract.

**Recommendation:** Use a Supabase RPC function with `UPDATE ... SET call_count = call_count + 1 WHERE call_count < limit RETURNING call_count` to make the check-and-increment atomic. Alternatively, use a Postgres advisory lock.

### P1 - Important

#### 4. Entire Conversation History Sent Every Call
**File:** `src/app.jsx:10235-10240`

Every message sends the full conversation history to Claude. For a lesson with 15+ exchanges, this means sending increasingly large payloads that burn tokens, increase latency, and eventually risk hitting context limits.

**Recommendation:** Implement a sliding window (e.g., last 10 messages) or summarize older messages. The system prompt already contains the essential context (lesson, phase, expected query), so older messages provide diminishing returns. Keep the last N messages + a summary of earlier context.

#### 5. System Prompt Duplication for Feedback Phase
**File:** `src/app.jsx:9768-9844`

The feedback phase has TWO nearly identical prompt blocks (lines 9768-9802 and 9804-9844). Both are included in the same prompt since both check `phase === 'feedback'`. This wastes ~400 tokens per feedback call and could confuse the model with partially contradictory instructions.

**Recommendation:** Merge the two feedback blocks into a single, cohesive prompt. The second block's error diagnosis framework and frustration detection should be integrated into the first block's structure.

#### 6. Monolithic app.jsx (~18,000+ lines)
**File:** `src/app.jsx`

All AI tutor logic (state, API calls, prompts, UI) lives in a single massive file. This makes the code difficult to maintain, test, and reason about.

**Recommendation:** Extract into modules:
- `src/ai-tutor/hooks/useAiTutor.js` - State management and API calls
- `src/ai-tutor/prompts.js` - System prompt generation
- `src/ai-tutor/phases.js` - Phase transition logic
- `src/ai-tutor/components/` - UI components (ChatMessage, LessonSidebar, etc.)

#### 7. No SQL Injection Protection for AI-Generated Queries
**File:** `src/app.jsx:10294`

The expected SQL from AI responses is executed directly via `db.exec(expectedSql)`. While this runs in a client-side SQLite instance (limiting blast radius), a malicious or hallucinated AI response could execute `DROP TABLE` or other destructive queries against the local database.

**Recommendation:** Run expected SQL in a read-only transaction, or validate that the query starts with `SELECT` before execution. Add a try-catch (already present) but also add query sanitization.

#### 8. No Streaming Support
**File:** `ai-tutor.ts:110-124`

Responses wait for the full Claude response before displaying. For longer teaching explanations, this creates a poor UX with a long loading spinner.

**Recommendation:** Implement streaming using the Anthropic streaming API (`stream: true`). Pipe chunks through the edge function using Server-Sent Events or a ReadableStream. Display tokens as they arrive for a much more responsive feel.

### P2 - Nice to Have

#### 9. Limited Answer Validation
Currently, answer correctness is determined entirely by the AI's judgment. There's no programmatic comparison between the user's SQL output and the expected SQL output, even though both results are available client-side.

**Recommendation:** After the user runs their query, compare `aiUserResult` with `aiExpectedResult` programmatically (column names match, row values match or are a subset). Use this as a ground-truth signal alongside the AI's feedback. This would also allow instant feedback before the API call returns.

#### 10. Hardcoded Table Schemas in Prompt
**File:** `src/app.jsx:9678-9684`

Table schemas are hardcoded strings in the prompt builder. If the database schema changes, the prompts will be out of sync.

**Recommendation:** Derive table schemas dynamically by querying `sqlite_master` and `PRAGMA table_info(tablename)` at lesson start. This ensures prompts always match the actual data.

#### 11. No Lesson Difficulty Adaptation
The 10 lessons follow a fixed sequence. A student who already knows basic SQL must still go through "Introduction to SQL" before reaching JOINs.

**Recommendation:** Add a placement assessment (3-5 questions) that determines the student's starting level. Allow lesson skipping if the student demonstrates mastery. Track per-concept mastery to recommend targeted review.

#### 12. Usage Tracking Only Counts Calls, Not Quality
The `ai_usage` table tracks call counts but not outcomes (was the response helpful? did the student progress?).

**Recommendation:** Log additional fields: `lesson_id`, `phase`, `was_correct` (when applicable), `hint_level`, `response_time_ms`. This enables analytics on which lessons need improvement, where students get stuck, and AI response quality.

#### 13. `max_tokens: 1000` May Truncate Complex Explanations
**File:** `ai-tutor.ts:119`

For teaching phases and detailed feedback, 1000 tokens can be tight, especially when the prompt asks for analogies, examples, and step-by-step breakdowns.

**Recommendation:** Make `max_tokens` phase-dependent: 500 for intro/practice (short responses), 1200 for teaching/feedback (detailed explanations), 800 for comprehension. Pass the phase from the client or infer it from the system prompt.

#### 14. CORS Set to Allow All Origins
**File:** `ai-tutor.ts:24`

`Access-Control-Allow-Origin: *` allows any website to call the edge function. While the function requires a valid username, this still expands the attack surface.

**Recommendation:** Restrict to the actual domain(s) where SQL Quest is hosted.

---

## Summary

The AI tutor is well-designed with strong pedagogical features (Socratic hints, adaptive tone, guided build mode, skill tracking). The main areas for improvement are:

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Structured correct/incorrect signal | Low | High |
| P0 | Robust phase transitions | Low | High |
| P0 | Atomic rate limit check | Medium | Medium |
| P1 | Conversation window/summarization | Medium | High |
| P1 | Merge duplicate feedback prompts | Low | Medium |
| P1 | Extract from monolithic app.jsx | High | High |
| P1 | SQL query sanitization | Low | Medium |
| P1 | Streaming responses | Medium | High |
| P2 | Programmatic answer comparison | Medium | High |
| P2 | Dynamic table schemas | Low | Low |
| P2 | Placement assessment | High | Medium |
| P2 | Richer usage analytics | Low | Medium |
| P2 | Phase-dependent max_tokens | Low | Low |
| P2 | CORS restriction | Low | Low |
