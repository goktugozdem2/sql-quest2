# Interview Helper — Phase 2A: First End-to-End Question Loop

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship the first end-to-end "see a question on screen → AI answers in the overlay" loop. Scope is intentionally narrow: **screen-only capture**, **Claude only**, **manual hotkey trigger**, **SQL sandbox round-trip**. Phase 2B adds mic + system audio + Deepgram + multi-provider routing + behavioral-question support. Phase 2A's deliverable is a working demo where the candidate opens any SQL question on screen, hits a hotkey, and gets a verified SQL answer in the overlay within ~3 seconds.

**Architecture:**
1. Renderer process owns the overlay UI and the `sql.js` sandbox.
2. Main process owns the screen capture and the hotkey listener.
3. Backend `/llm/answer` Edge Function (Phase 2A: Claude only) is the only place the API key lives.
4. Main process sends a screen frame + optional context to the backend, gets back a streamed answer, forwards token-by-token to renderer via IPC.
5. Renderer displays the answer; if it's SQL, runs it through the sandbox first and shows verification badge.

**Tech Stack additions on top of Phase 1:**
- `@supabase/supabase-js` (renderer side, for auth tokens)
- `sql.js` ~600KB wasm in renderer
- Anthropic SDK in backend Edge Function

**Project location:** Same monorepo at `/Users/cgozdemm/interview-helper/` from Phase 1.

---

## Pre-flight

You need:
- Phase 1 complete (it is — verified by `git log --oneline` showing all 14 commits)
- An Anthropic API key (`ANTHROPIC_API_KEY`) — operator provides; will be set in `supabase/functions/.env`
- Local Supabase stack running (or willingness to defer integration tests)
- Docker Desktop running (for Supabase)

---

## Phase 2A deliverable

By the end of Task 8:
- `npm run dev` from `apps/desktop` opens the overlay; pressing **Cmd+Shift+\\** captures the screen and sends it to `/llm/answer`
- Backend routes to Claude with a system prompt for SQL coding answers
- AI response streams back to overlay; SQL is run through `sql.js` sandbox before display; failed queries cause AI self-correction
- Answer card shows query + verification badge; latency badge ("1.8s · Claude")
- Cmd+Esc dismisses back to idle

**Not in Phase 2A (deferred):**
- Mic capture, system audio, Deepgram (Phase 2B)
- GPT-5 / Gemini routing (Phase 2B)
- Auto-detect classifier (Phase 2B)
- Behavioral / case question handling (Phase 2B)
- Re-roll hotkey (Phase 2B)
- Kill-switch + cache wipe (Phase 3)

---

## File structure (additions)

```
apps/desktop/src/
├── main/
│   ├── index.ts                 # extend: register hotkeys, wire IPC
│   ├── window.ts                # (Phase 1) unchanged
│   ├── capture/
│   │   └── screen.ts            # NEW — desktopCapturer wrapper
│   ├── hotkeys.ts               # NEW — globalShortcut registration
│   ├── questionloop.ts          # NEW — orchestrates capture → llm → render
│   └── api.ts                   # NEW — talks to /llm/answer with auth
├── preload/
│   └── index.ts                 # extend: expose IPC events to renderer
└── renderer/
    ├── App.tsx                  # extend: 3 visual states
    ├── state.ts                 # NEW — small state machine
    ├── sandbox/
    │   └── sqlrun.ts            # NEW — sql.js runner
    └── components/
        ├── ReadyPill.tsx        # NEW
        ├── ListeningPulse.tsx   # NEW
        └── AnswerCard.tsx       # NEW

supabase/functions/
├── llm-answer/
│   ├── index.ts                 # NEW
│   └── index.test.ts            # NEW
└── _shared/
    └── claude.ts                # NEW — Anthropic SDK wrapper
```

---

## Task 1: Backend — Anthropic SDK wrapper + `/llm-answer` Edge Function

**Files:**
- Create: `supabase/functions/_shared/claude.ts`
- Create: `supabase/functions/llm-answer/index.ts`
- Create: `supabase/functions/llm-answer/index.test.ts`

**Type:** TDD on the `/llm-answer` endpoint (mocking provider response). Real provider call is verified manually in Task 8.

- [ ] **Step 1: Write `_shared/claude.ts`**

```ts
// supabase/functions/_shared/claude.ts
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.0";

export function claudeClient() {
  return new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
}

export const SYSTEM_PROMPT_SQL = `You are a senior SQL expert helping a candidate during a live interview.
The candidate has shared a screenshot containing a SQL problem. Read it carefully, write a CORRECT SQL query.
Output ONLY the SQL query — no explanations, no markdown fences, no commentary. The candidate will copy-paste it.
Use clean, idiomatic SQL. Prefer CTEs over deeply nested subqueries. Use short, readable aliases.`;
```

- [ ] **Step 2: Write the failing test for `/llm-answer`**

```ts
// supabase/functions/llm-answer/index.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.218.0/assert/mod.ts";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";

async function signupAndGetToken() {
  const email = `q${crypto.randomUUID()}@example.com`;
  const r = await fetch(`${FN_URL}/auth-signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "p4ssword!", device_fp: "fp" + crypto.randomUUID() }),
  });
  return (await r.json()).access_token;
}

Deno.test("llm-answer requires Authorization", async () => {
  const r = await fetch(`${FN_URL}/llm-answer`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ screen_image_b64: "x", type: "sql" }),
  });
  assertEquals(r.status, 401);
});

Deno.test("llm-answer rejects missing fields", async () => {
  const token = await signupAndGetToken();
  const r = await fetch(`${FN_URL}/llm-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  assertEquals(r.status, 400);
});

Deno.test("llm-answer returns a response with valid input (mocked at provider)", async () => {
  // This test runs with ANTHROPIC_API_KEY=mock — the implementation should detect
  // this sentinel and return a deterministic stub instead of calling the real API.
  const token = await signupAndGetToken();
  const r = await fetch(`${FN_URL}/llm-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ screen_image_b64: "iVBORw0KGgoAAAANSUhEUg...", type: "sql" }),
  });
  assertEquals(r.status, 200);
  const body = await r.json();
  assertExists(body.answer);
  assertEquals(body.provider, "claude");
});
```

- [ ] **Step 3: Implement `llm-answer/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { claudeClient, SYSTEM_PROMPT_SQL } from "../_shared/claude.ts";

interface Req { screen_image_b64: string; type: "sql" | "code" }

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return jerr(401, "missing-token");
  const jwt = auth.slice(7);

  let body: Req;
  try { body = await req.json(); } catch { return jerr(400, "bad-json"); }
  if (!body.screen_image_b64 || !body.type) return jerr(400, "missing-fields");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return jerr(401, "invalid-token");

  // Mock mode for tests
  if (Deno.env.get("ANTHROPIC_API_KEY") === "mock") {
    return Response.json({
      answer: "SELECT 1; -- mocked",
      provider: "claude",
      latency_ms: 0,
    });
  }

  const t0 = Date.now();
  const claude = claudeClient();
  const msg = await claude.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT_SQL,
    messages: [{
      role: "user",
      content: [{
        type: "image",
        source: { type: "base64", media_type: "image/png", data: body.screen_image_b64 },
      }],
    }],
  });

  const text = msg.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  return Response.json({
    answer: text,
    provider: "claude",
    latency_ms: Date.now() - t0,
  });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/cgozdemm/interview-helper && deno check supabase/functions/llm-answer/index.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/claude.ts supabase/functions/llm-answer
git commit -m "feat(api): llm-answer with Claude provider (Phase 2A MVP)"
```

---

## Task 2: Desktop — Screen capture module

**Files:**
- Create: `apps/desktop/src/main/capture/screen.ts`
- Create: `apps/desktop/tests/capture.test.ts`

**Type:** TDD with mocked Electron.

- [ ] **Step 1: Failing test**

```ts
// apps/desktop/tests/capture.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  desktopCapturer: {
    getSources: vi.fn().mockResolvedValue([
      { id: "screen:0:0", name: "Entire screen", thumbnail: { toPNG: () => Buffer.from([0x89, 0x50, 0x4e, 0x47]) } },
    ]),
  },
  screen: { getPrimaryDisplay: () => ({ size: { width: 2560, height: 1440 } }) },
}));

import { captureScreenAsPngBase64 } from "../src/main/capture/screen";

describe("captureScreenAsPngBase64", () => {
  it("returns a base64 string of the primary display screenshot", async () => {
    const b64 = await captureScreenAsPngBase64();
    expect(typeof b64).toBe("string");
    // PNG magic bytes 0x89 0x50 0x4e 0x47 → "iVBORw==" prefix in base64
    expect(b64).toMatch(/^iVBO/);
  });

  it("throws if no screen source is available", async () => {
    const { desktopCapturer } = await import("electron");
    (desktopCapturer.getSources as any).mockResolvedValueOnce([]);
    await expect(captureScreenAsPngBase64()).rejects.toThrow(/no screen source/);
  });
});
```

- [ ] **Step 2: Run, see fail**

```bash
cd /Users/cgozdemm/interview-helper && npm test --workspace=@interview-helper/desktop
```

- [ ] **Step 3: Implement**

```ts
// apps/desktop/src/main/capture/screen.ts
import { desktopCapturer, screen } from "electron";

export async function captureScreenAsPngBase64(): Promise<string> {
  const display = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: display.size.width, height: display.size.height },
  });
  if (sources.length === 0) throw new Error("no screen source available");
  return sources[0].thumbnail.toPNG().toString("base64");
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/capture apps/desktop/tests/capture.test.ts
git commit -m "feat(desktop): screen capture via desktopCapturer (TDD)"
```

---

## Task 3: Desktop — API client (talks to `/llm-answer`)

**Files:**
- Create: `apps/desktop/src/main/api.ts`
- Create: `apps/desktop/tests/api.test.ts`

**Type:** TDD with mocked fetch.

- [ ] **Step 1: Failing test**

```ts
// apps/desktop/tests/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { askLlm } from "../src/main/api";

describe("askLlm", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("POSTs screen + type + auth header to /llm-answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ answer: "SELECT 1;", provider: "claude", latency_ms: 1200 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await askLlm({ token: "tok", screenB64: "img", type: "sql" });
    expect(res.answer).toBe("SELECT 1;");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/llm-answer$/);
    expect(init.headers.Authorization).toBe("Bearer tok");
    const body = JSON.parse(init.body);
    expect(body.screen_image_b64).toBe("img");
    expect(body.type).toBe("sql");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => ({ error: "boom" }),
    }));
    await expect(askLlm({ token: "tok", screenB64: "x", type: "sql" })).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run, see fail.**

- [ ] **Step 3: Implement**

```ts
// apps/desktop/src/main/api.ts
const API_BASE = process.env.IH_API_BASE ?? "http://localhost:54321/functions/v1";

export async function askLlm(args: { token: string; screenB64: string; type: "sql" | "code" }) {
  const r = await fetch(`${API_BASE}/llm-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.token}` },
    body: JSON.stringify({ screen_image_b64: args.screenB64, type: args.type }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `http-${r.status}`);
  return body as { answer: string; provider: string; latency_ms: number };
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/api.ts apps/desktop/tests/api.test.ts
git commit -m "feat(desktop): API client for /llm-answer (TDD)"
```

---

## Task 4: Renderer — sql.js sandbox runner

**Files:**
- Modify: `apps/desktop/package.json` (add `sql.js` dep)
- Create: `apps/desktop/src/renderer/sandbox/sqlrun.ts`
- Create: `apps/desktop/tests/sqlrun.test.ts`

**Type:** TDD on the sandbox runner.

- [ ] **Step 1: Add `sql.js` dependency**

```bash
cd /Users/cgozdemm/interview-helper/apps/desktop && npm install sql.js@^1.10.3 @types/sql.js@^1.4.9
```

- [ ] **Step 2: Failing test**

```ts
// apps/desktop/tests/sqlrun.test.ts
import { describe, it, expect } from "vitest";
import { runQueryAgainstSchema } from "../src/renderer/sandbox/sqlrun";

const SCHEMA = `
  create table customers (id integer, name text);
  insert into customers values (1, 'Ada'), (2, 'Bob');
`;

describe("runQueryAgainstSchema", () => {
  it("returns rows for a valid select", async () => {
    const r = await runQueryAgainstSchema(SCHEMA, "select name from customers order by id");
    expect(r.ok).toBe(true);
    expect(r.rows).toEqual([["Ada"], ["Bob"]]);
  });

  it("returns ok=false with error message for a bad query", async () => {
    const r = await runQueryAgainstSchema(SCHEMA, "select bogus from customers");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/no such column/i);
  });

  it("returns ok=true with empty rows when query yields nothing", async () => {
    const r = await runQueryAgainstSchema(SCHEMA, "select name from customers where id = 99");
    expect(r.ok).toBe(true);
    expect(r.rows).toEqual([]);
  });
});
```

- [ ] **Step 3: Run, see fail.**

- [ ] **Step 4: Implement**

```ts
// apps/desktop/src/renderer/sandbox/sqlrun.ts
import initSqlJs from "sql.js";
import type { Database } from "sql.js";

let SQL: any;

async function getSQL() {
  if (!SQL) SQL = await initSqlJs({});
  return SQL;
}

export interface SandboxResult {
  ok: boolean;
  rows?: any[][];
  error?: string;
}

export async function runQueryAgainstSchema(schemaSql: string, querySql: string): Promise<SandboxResult> {
  const SQL = await getSQL();
  const db: Database = new SQL.Database();
  try {
    db.exec(schemaSql);
    const result = db.exec(querySql);
    const rows = result.length > 0 ? result[0].values : [];
    return { ok: true, rows };
  } catch (e: any) {
    return { ok: false, error: e.message ?? String(e) };
  } finally {
    db.close();
  }
}
```

- [ ] **Step 5: Run, verify pass.**

Note: `sql.js` loads a wasm binary at runtime. The default vitest node env will fetch it from `node_modules/sql.js/dist/`. If tests fail on wasm load, set `test: { server: { deps: { inline: ["sql.js"] } } }` in `electron.vite.config.ts`'s renderer block — but try without first.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/package.json apps/desktop/src/renderer/sandbox apps/desktop/tests/sqlrun.test.ts
git commit -m "feat(desktop): sql.js sandbox runner in renderer (TDD)"
```

---

## Task 5: Hotkey registration

**Files:**
- Create: `apps/desktop/src/main/hotkeys.ts`
- Create: `apps/desktop/tests/hotkeys.test.ts`

**Type:** TDD with mocked Electron globalShortcut.

- [ ] **Step 1: Failing test**

```ts
// apps/desktop/tests/hotkeys.test.ts
import { describe, it, expect, vi } from "vitest";

const registered: Record<string, () => void> = {};
vi.mock("electron", () => ({
  globalShortcut: {
    register: vi.fn((accel: string, cb: () => void) => { registered[accel] = cb; return true; }),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
  },
}));

import { registerHotkeys } from "../src/main/hotkeys";

describe("registerHotkeys", () => {
  it("registers Cmd/Ctrl+Shift+\\ for trigger and Esc for dismiss", () => {
    const onTrigger = vi.fn();
    const onDismiss = vi.fn();
    registerHotkeys({ onTrigger, onDismiss });
    expect(registered["CommandOrControl+Shift+\\"]).toBeDefined();
    expect(registered["Escape"]).toBeDefined();

    registered["CommandOrControl+Shift+\\"]();
    expect(onTrigger).toHaveBeenCalledOnce();

    registered["Escape"]();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run, see fail.**

- [ ] **Step 3: Implement**

```ts
// apps/desktop/src/main/hotkeys.ts
import { globalShortcut } from "electron";

export function registerHotkeys(handlers: { onTrigger: () => void; onDismiss: () => void }) {
  globalShortcut.register("CommandOrControl+Shift+\\", handlers.onTrigger);
  globalShortcut.register("Escape", handlers.onDismiss);
}

export function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
}
```

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/hotkeys.ts apps/desktop/tests/hotkeys.test.ts
git commit -m "feat(desktop): global hotkeys for trigger + dismiss (TDD)"
```

---

## Task 6: Renderer — overlay state machine + 3 components

**Files:**
- Create: `apps/desktop/src/renderer/state.ts`
- Create: `apps/desktop/src/renderer/components/ReadyPill.tsx`
- Create: `apps/desktop/src/renderer/components/ListeningPulse.tsx`
- Create: `apps/desktop/src/renderer/components/AnswerCard.tsx`
- Modify: `apps/desktop/src/renderer/App.tsx`

**Type:** Mostly UI scaffolding; one TDD-able test on the state machine.

- [ ] **Step 1: TDD on `state.ts`**

`apps/desktop/tests/state.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { reducer, initialState } from "../src/renderer/state";

describe("overlay state reducer", () => {
  it("idle → listening on TRIGGER", () => {
    const s = reducer(initialState, { type: "TRIGGER" });
    expect(s.kind).toBe("listening");
  });

  it("listening → answer on ANSWER_RECEIVED", () => {
    const s1 = reducer(initialState, { type: "TRIGGER" });
    const s2 = reducer(s1, { type: "ANSWER_RECEIVED", answer: "SELECT 1;", provider: "claude", latency_ms: 1200 });
    expect(s2.kind).toBe("answer");
    if (s2.kind === "answer") expect(s2.answer).toBe("SELECT 1;");
  });

  it("answer → idle on DISMISS", () => {
    const s1 = reducer(initialState, { type: "TRIGGER" });
    const s2 = reducer(s1, { type: "ANSWER_RECEIVED", answer: "x", provider: "claude", latency_ms: 100 });
    const s3 = reducer(s2, { type: "DISMISS" });
    expect(s3.kind).toBe("idle");
  });

  it("listening → idle on ERROR", () => {
    const s1 = reducer(initialState, { type: "TRIGGER" });
    const s2 = reducer(s1, { type: "ERROR", message: "bad" });
    expect(s2.kind).toBe("idle");
  });
});
```

- [ ] **Step 2: Run, see fail.**

- [ ] **Step 3: Implement state**

```ts
// apps/desktop/src/renderer/state.ts
export type State =
  | { kind: "idle" }
  | { kind: "listening" }
  | { kind: "answer"; answer: string; provider: string; latency_ms: number };

export type Action =
  | { type: "TRIGGER" }
  | { type: "ANSWER_RECEIVED"; answer: string; provider: string; latency_ms: number }
  | { type: "DISMISS" }
  | { type: "ERROR"; message: string };

export const initialState: State = { kind: "idle" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "TRIGGER": return { kind: "listening" };
    case "ANSWER_RECEIVED": return { kind: "answer", answer: action.answer, provider: action.provider, latency_ms: action.latency_ms };
    case "DISMISS": return { kind: "idle" };
    case "ERROR": return { kind: "idle" };  // Phase 2A: silent fallback. Phase 3 adds an error toast.
  }
}
```

- [ ] **Step 4: Run tests, verify pass.**

- [ ] **Step 5: Implement the 3 components**

```tsx
// apps/desktop/src/renderer/components/ReadyPill.tsx
export function ReadyPill() {
  return (
    <div style={{
      position: "fixed", bottom: 12, right: 12, padding: "6px 14px",
      background: "rgba(22,22,26,0.85)", border: "1px solid rgba(255,227,77,0.35)",
      borderRadius: 999, fontSize: 12, color: "#fff", display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ width: 6, height: 6, background: "#7ed492", borderRadius: 4 }} />
      ready · ⌘⇧\
    </div>
  );
}
```

```tsx
// apps/desktop/src/renderer/components/ListeningPulse.tsx
export function ListeningPulse() {
  return (
    <div style={{
      position: "fixed", bottom: 12, right: 12, padding: "6px 14px",
      background: "rgba(22,22,26,0.95)", border: "1px solid rgba(255,227,77,0.7)",
      borderRadius: 8, fontSize: 12, color: "#FFE34D", display: "inline-flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ width: 6, height: 6, background: "#FFE34D", borderRadius: 4 }} />
      thinking…
    </div>
  );
}
```

```tsx
// apps/desktop/src/renderer/components/AnswerCard.tsx
import { useEffect, useState } from "react";
import { runQueryAgainstSchema } from "../sandbox/sqlrun";

export function AnswerCard({ answer, provider, latency_ms }: { answer: string; provider: string; latency_ms: number }) {
  // Phase 2A: skip schema parsing — Phase 2B will read schema from screen.
  // For now we just display the answer with a "not yet verified" badge.
  return (
    <div style={{
      position: "fixed", bottom: 12, right: 12, width: 360, maxHeight: 360,
      overflow: "auto", padding: 14, background: "rgba(16,16,20,0.95)",
      border: "1px solid rgba(255,227,77,0.5)", borderRadius: 10, fontSize: 12, color: "#fff",
      boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
    }}>
      <div style={{ fontSize: 9, color: "#FFE34D", letterSpacing: "0.06em", marginBottom: 8 }}>
        {provider.toUpperCase()} · {(latency_ms / 1000).toFixed(1)}s
      </div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, color: "#cfcfcf" }}>{answer}</pre>
      <div style={{ fontSize: 10, color: "#888", marginTop: 8 }}>Press Esc to dismiss</div>
    </div>
  );
}
```

- [ ] **Step 6: Wire `App.tsx` to consume IPC events**

```tsx
// apps/desktop/src/renderer/App.tsx
import { useEffect, useReducer } from "react";
import { reducer, initialState } from "./state";
import { ReadyPill } from "./components/ReadyPill";
import { ListeningPulse } from "./components/ListeningPulse";
import { AnswerCard } from "./components/AnswerCard";

declare global {
  interface Window { ih: { onTrigger(cb: () => void): void; onAnswer(cb: (a: any) => void): void; onDismiss(cb: () => void): void; onError(cb: (msg: string) => void): void; } }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    window.ih.onTrigger(() => dispatch({ type: "TRIGGER" }));
    window.ih.onAnswer((p) => dispatch({ type: "ANSWER_RECEIVED", ...p }));
    window.ih.onDismiss(() => dispatch({ type: "DISMISS" }));
    window.ih.onError((msg) => dispatch({ type: "ERROR", message: msg }));
  }, []);

  if (state.kind === "idle") return <ReadyPill />;
  if (state.kind === "listening") return <ListeningPulse />;
  return <AnswerCard answer={state.answer} provider={state.provider} latency_ms={state.latency_ms} />;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer apps/desktop/tests/state.test.ts
git commit -m "feat(desktop): overlay state machine + 3 visual states"
```

---

## Task 7: Question loop + IPC bridge in main process

**Files:**
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/main/questionloop.ts`

**Type:** Integration glue. Manual smoke-test by running.

- [ ] **Step 1: Implement `questionloop.ts`**

```ts
// apps/desktop/src/main/questionloop.ts
import { BrowserWindow } from "electron";
import { captureScreenAsPngBase64 } from "./capture/screen";
import { askLlm } from "./api";

export async function triggerAnswer(win: BrowserWindow, token: string) {
  win.webContents.send("ih:trigger");
  try {
    const screenB64 = await captureScreenAsPngBase64();
    const result = await askLlm({ token, screenB64, type: "sql" });
    win.webContents.send("ih:answer", result);
  } catch (e: any) {
    win.webContents.send("ih:error", e.message ?? String(e));
  }
}
```

- [ ] **Step 2: Extend preload**

```ts
// apps/desktop/src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ih", {
  phase: 2,
  onTrigger: (cb: () => void) => ipcRenderer.on("ih:trigger", cb),
  onAnswer: (cb: (p: any) => void) => ipcRenderer.on("ih:answer", (_e, p) => cb(p)),
  onDismiss: (cb: () => void) => ipcRenderer.on("ih:dismiss", cb),
  onError: (cb: (msg: string) => void) => ipcRenderer.on("ih:error", (_e, msg) => cb(msg)),
});
```

- [ ] **Step 3: Wire main process**

```ts
// apps/desktop/src/main/index.ts
import { app, BrowserWindow } from "electron";
import { createOverlayWindow } from "./window";
import { registerHotkeys, unregisterAllHotkeys } from "./hotkeys";
import { triggerAnswer } from "./questionloop";

let mainWindow: BrowserWindow | null = null;

// Phase 2A: dev token. Phase 4 wires real auth.
const DEV_TOKEN = process.env.IH_DEV_TOKEN ?? "";

app.whenReady().then(() => {
  mainWindow = createOverlayWindow();
  registerHotkeys({
    onTrigger: () => mainWindow && triggerAnswer(mainWindow, DEV_TOKEN),
    onDismiss: () => mainWindow?.webContents.send("ih:dismiss"),
  });
});

app.on("will-quit", () => unregisterAllHotkeys());

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/main/questionloop.ts apps/desktop/src/main/index.ts apps/desktop/src/preload/index.ts
git commit -m "feat(desktop): question loop + IPC bridge wired to hotkeys"
```

---

## Task 8: End-to-end smoke test

**Files:** none (manual verification only)

This is the moment of truth. Operator runs the full stack and verifies the loop.

- [ ] **Step 1: Boot Supabase**

```bash
cd /Users/cgozdemm/interview-helper
supabase start
supabase db reset    # ensures schema is applied
```

- [ ] **Step 2: Set Anthropic key + serve all functions**

```bash
echo "ANTHROPIC_API_KEY=sk-ant-…" >> supabase/functions/.env
supabase functions serve --no-verify-jwt &
```

- [ ] **Step 3: Mint a dev token via signup**

```bash
curl -s -X POST http://localhost:54321/functions/v1/auth-signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev@local","password":"p4ssword!","device_fp":"dev-1"}' | jq -r .access_token
# Copy that token.
```

- [ ] **Step 4: Run the desktop app with the token**

```bash
IH_DEV_TOKEN=<paste-token-here> npm run dev --workspace=@interview-helper/desktop
```

- [ ] **Step 5: Manual smoke**

1. Open any SQL question on screen (a screenshot, datalemur.com problem, etc.)
2. Press **⌘⇧\\** — overlay shows "thinking…"
3. Within ~3s, answer card appears with the SQL query, Claude badge, latency
4. Press **Esc** — overlay returns to ready pill
5. Cmd+Shift+3 — verify the overlay is invisible in the screenshot (still works from Phase 1)

If all 5 steps work: Phase 2A is done.

If something breaks: troubleshoot. Common issues:
- `IH_DEV_TOKEN` env var not picked up by Electron — `IH_DEV_TOKEN` is read in `main/index.ts`; ensure it's exported in the same shell that runs `npm run dev`.
- 401 from `/llm-answer` — token expired (Supabase JWTs are 1hr by default); regenerate via signup.
- Empty answer — Claude refused or hit rate limit; check supabase functions logs.

---

## Phase 2A wrap-up checklist

- [ ] All 8 tasks committed
- [ ] `npm test --workspaces` shows 5+ new tests passing (capture, api, sqlrun, state, hotkeys)
- [ ] Manual smoke (Task 8) passes end-to-end
- [ ] Phase 2B can now plan: mic + system audio + Deepgram + multi-provider routing

---

## Notes for the executing engineer

1. **Phase 2A scope is deliberate.** Skip-the-mic is intentional — it lets us prove the screen→Claude→sandbox→overlay loop with zero new audio infrastructure. The audio path is Phase 2B.

2. **`sql.js` sandbox in Phase 2A is partial.** This phase adds the sandbox CODE (Task 4) but the question loop (Task 7) doesn't yet pipe the AI's answer through it — that integration is Phase 2B once schema parsing is in place. The sandbox tests in Task 4 prove the runner works; Phase 2B wires it to the answer card.

3. **Manual auth token in Task 7 is a known limitation.** Phase 4 builds the real login flow. For Phase 2A, the developer manually mints a token via curl and exports `IH_DEV_TOKEN`. This keeps Phase 2A's surface tight.

4. **No retry / re-roll.** Phase 2A has one Claude call per hotkey press. If it fails, the user just hits the hotkey again. Phase 2B adds the parallel-launch fallback to GPT.

5. **Latency target:** ~3s end-to-end is acceptable for Phase 2A (Claude vision is the slow part). The 2-second target from the spec assumes Phase 2B's parallel routing.
