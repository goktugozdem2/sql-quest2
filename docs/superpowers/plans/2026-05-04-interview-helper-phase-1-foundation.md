# Interview Helper — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the foundation for the interview-helper product: a new repo with monorepo workspace structure, a Supabase backend with the full schema and four working Edge Functions (auth signup/login, billing checkout/webhook), a marketing site with a waitlist signup, and an Electron app skeleton with screen-capture-protected window. End-of-phase deliverable is a publicly accessible landing page collecting waitlist emails plus a runnable desktop binary that opens an invisible-to-screenshare window.

**Architecture:** Monorepo using npm workspaces. Two apps (`desktop` Electron + `web` marketing site) share a `packages/shared` library for types and pure credit-math functions. Backend is Supabase Edge Functions (Deno) with a Postgres DB. All TypeScript end-to-end. TDD for credit math and JWT verification (the logic-heavy bits); scaffolding tasks use build-and-verify rather than test-first.

**Tech Stack:**
- Repo: npm workspaces, TypeScript 5, ESLint, Prettier
- Desktop: Electron 30, electron-vite, React 18, Tailwind
- Web: Vite, React 18, Tailwind
- Backend: Supabase (Postgres + Edge Functions on Deno), Stripe
- Test: Vitest (unit), Playwright (later phases)
- CI: GitHub Actions

**Project location:** New repo at `/Users/cgozdemm/interview-helper/`. The plan + spec stay in `/Users/cgozdemm/sql-quest2/docs/superpowers/` (where the brainstorm happened) and are referenced from the new repo's README.

---

## Pre-flight: read these before starting

Skim the spec first: [`/Users/cgozdemm/sql-quest2/docs/superpowers/specs/2026-05-04-interview-helper-design.md`](../specs/2026-05-04-interview-helper-design.md). Pay particular attention to the **database schema**, **API surface**, **pricing SKUs**, and the **Tier-2 stealth** table — those drive the implementation choices below.

If the engineer has not used `supabase` CLI before, install it: `brew install supabase/tap/supabase` and run `supabase login` once. The plan assumes a fresh Supabase project will be created via dashboard or CLI; you do not need access to the SQL Quest project.

---

## File structure (target end-state of Phase 1)

```
/Users/cgozdemm/interview-helper/
├── package.json                  # workspaces root
├── .gitignore
├── .env.example
├── tsconfig.base.json
├── README.md
├── .github/workflows/ci.yml
├── apps/
│   ├── desktop/
│   │   ├── package.json
│   │   ├── electron.vite.config.ts
│   │   ├── src/
│   │   │   ├── main/index.ts        # Electron main: app boot + window
│   │   │   ├── main/window.ts       # createOverlayWindow with content protection
│   │   │   ├── preload/index.ts     # tiny IPC bridge stub
│   │   │   └── renderer/
│   │   │       ├── index.html
│   │   │       ├── main.tsx
│   │   │       └── App.tsx          # placeholder "ready" pill
│   │   └── tests/window.test.ts
│   └── web/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── Landing.tsx
│       │   └── api.ts               # fetch wrapper for waitlist endpoint
│       └── tests/api.test.ts
├── packages/
│   └── shared/
│       ├── package.json
│       ├── src/
│       │   ├── types.ts             # User, CreditTxn, Session, SKU
│       │   └── credits.ts           # pure credit math (decimal-safe)
│       └── tests/credits.test.ts
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 0001_initial_schema.sql
    └── functions/
        ├── _shared/
        │   ├── jwt.ts                # verifyJwt() helper
        │   └── stripe.ts             # stripe client factory
        ├── auth-signup/index.ts
        ├── auth-login/index.ts
        ├── billing-checkout/index.ts
        └── billing-webhook/index.ts
```

Each file has a single responsibility:
- `packages/shared/credits.ts` — pure decimal arithmetic over credits, no I/O. The trickiest logic in Phase 1.
- `supabase/functions/_shared/jwt.ts` — JWT verification used by every protected endpoint.
- `apps/desktop/src/main/window.ts` — the only place content protection is configured. Future phases extend this.
- `apps/web/src/Landing.tsx` — single-page landing with hero + waitlist form. No router for v1.

---

## Phase 1 deliverable (Definition of Done)

By the end of Task 13:

- `git push` to a new GitHub repo, `main` builds green in CI
- Waitlist signups land in `users` table via the `auth-signup` Edge Function
- Local dev: `npm run dev` in `apps/web` shows the landing page with a working email form
- Local dev: `npm run dev` in `apps/desktop` opens an Electron window that, when the OS captures the screen, shows a black rectangle where the window is (proof content protection works)
- All unit tests pass: `npm test` from repo root
- A Stripe product for "Starter — $29 / 3 credits" is configured and the checkout endpoint returns a working Stripe Checkout URL
- Stripe webhook handler responds 200 to a signed test event and writes a `credit_txns` row

**Not in Phase 1 (deferred to Phase 2+):** screen/audio capture, LLM integration, hotkeys, sandbox SQL runner, auto-updater, signing/notarization, the other 4 SKUs (Plus / Power / Monthly / Lifetime — only Starter is wired to keep the surface small).

---

## Task 1: Repo init + monorepo skeleton

**Files:**
- Create: `/Users/cgozdemm/interview-helper/package.json`
- Create: `/Users/cgozdemm/interview-helper/.gitignore`
- Create: `/Users/cgozdemm/interview-helper/.env.example`
- Create: `/Users/cgozdemm/interview-helper/tsconfig.base.json`
- Create: `/Users/cgozdemm/interview-helper/README.md`

**Type:** Setup (no TDD — this is scaffolding). Verify by running.

- [ ] **Step 1: Init repo**

```bash
mkdir -p /Users/cgozdemm/interview-helper && cd /Users/cgozdemm/interview-helper
git init
```

- [ ] **Step 2: Write `package.json` (workspaces root)**

```json
{
  "name": "interview-helper",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint .",
    "build": "npm run build --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

- [ ] **Step 3: Write `.gitignore`**

```
node_modules
dist
.env
.env.local
.DS_Store
*.log
.supabase/
out/
```

- [ ] **Step 4: Write `.env.example`** (committed; documents required env vars without values)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
JWT_SECRET=
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 6: Write minimal `README.md`**

```markdown
# Interview Helper

Real-time AI assistant for video interviews. See spec at
`/Users/cgozdemm/sql-quest2/docs/superpowers/specs/2026-05-04-interview-helper-design.md`.

## Getting started
1. `npm install`
2. Copy `.env.example` → `.env` and fill in values
3. `npm test` to verify the workspace builds

## Workspaces
- `apps/desktop` — Electron app
- `apps/web` — marketing site
- `packages/shared` — shared types + credit math
- `supabase/functions` — Edge Functions
```

- [ ] **Step 7: Install + verify**

```bash
npm install
git add -A
git commit -m "chore: init monorepo workspace"
```

Expected: `npm install` completes, repo has `node_modules`, commit succeeds.

---

## Task 2: Shared types + credit math (TDD)

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/credits.ts`
- Create: `packages/shared/tests/credits.test.ts`

**Type:** TDD. Credit math is decimal-sensitive; tests come first.

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@interview-helper/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "decimal.js": "^10.4.3"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/shared/src/types.ts`**

```ts
export type SkuId =
  | "starter"      // $29 / 3 credits
  | "plus"         // $59 / 8 credits
  | "power"        // $89 / 15 credits
  | "monthly"      // $39 / unlimited / month
  | "lifetime";    // $249 / unlimited / forever

export interface User {
  id: string;
  email: string;
  created_at: string;
  device_fp: string | null;
  trial_used: boolean;
}

export interface CreditBalance {
  user_id: string;
  balance: string;             // decimal string, NOT number
  unlimited_until: string | null;
  updated_at: string;
}

export type TxnReason = "purchase" | "usage" | "bonus" | "refund" | "grant";

export interface CreditTxn {
  id: string;
  user_id: string;
  delta: string;               // decimal string
  reason: TxnReason;
  stripe_event: string | null;
  session_id: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  credits_used: string;
  device: string;
}
```

- [ ] **Step 4: Write the failing test for `creditsForElapsedMs`**

Create `packages/shared/tests/credits.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { creditsForElapsedMs, applyTxn } from "../src/credits";

describe("creditsForElapsedMs", () => {
  it("returns 0.5 for exactly 30 minutes", () => {
    expect(creditsForElapsedMs(30 * 60 * 1000)).toBe("0.500");
  });

  it("returns 0 for 0ms", () => {
    expect(creditsForElapsedMs(0)).toBe("0.000");
  });

  it("returns 0 for under 30 min — we tick at the 30-min boundary", () => {
    expect(creditsForElapsedMs(29 * 60 * 1000)).toBe("0.000");
    expect(creditsForElapsedMs(15 * 60 * 1000)).toBe("0.000");
  });

  it("returns 1.000 for 60 minutes", () => {
    expect(creditsForElapsedMs(60 * 60 * 1000)).toBe("1.000");
  });

  it("returns 1.500 for 90 minutes", () => {
    expect(creditsForElapsedMs(90 * 60 * 1000)).toBe("1.500");
  });
});

describe("applyTxn", () => {
  it("adds delta to balance, returning a decimal string", () => {
    expect(applyTxn("1.500", "0.500")).toBe("2.000");
  });

  it("subtracts when delta is negative", () => {
    expect(applyTxn("1.500", "-0.500")).toBe("1.000");
  });

  it("does not allow balance to go negative", () => {
    expect(() => applyTxn("0.000", "-0.500")).toThrow(/insufficient/);
  });

  it("handles small fractional deltas without floating-point error", () => {
    // 0.1 + 0.2 = 0.3 in decimal land, NOT 0.30000000000000004
    expect(applyTxn("0.100", "0.200")).toBe("0.300");
  });
});
```

- [ ] **Step 5: Run the test, verify it fails**

```bash
cd /Users/cgozdemm/interview-helper && npm test --workspace=@interview-helper/shared
```

Expected: tests fail with "module not found" or similar — `credits.ts` doesn't exist yet.

- [ ] **Step 6: Implement `packages/shared/src/credits.ts`**

```ts
import Decimal from "decimal.js";

const MS_PER_30_MIN = 30 * 60 * 1000;

/**
 * Returns the credits owed for a session that has run for `elapsedMs`,
 * as a decimal string with 3 fractional digits. Ticks at every 30-minute
 * boundary: 0 → 29:59, 0.5 → 59:59, 1.0 → 89:59, etc.
 */
export function creditsForElapsedMs(elapsedMs: number): string {
  const ticks = Math.floor(elapsedMs / MS_PER_30_MIN);
  return new Decimal(ticks).times(0.5).toFixed(3);
}

/**
 * Applies a delta (decimal string) to a balance (decimal string), returning
 * the new balance as a decimal string. Throws "insufficient balance" if the
 * result would be negative.
 */
export function applyTxn(balance: string, delta: string): string {
  const result = new Decimal(balance).plus(delta);
  if (result.isNegative()) {
    throw new Error("insufficient balance");
  }
  return result.toFixed(3);
}
```

- [ ] **Step 7: Add `packages/shared/src/index.ts`**

```ts
export * from "./types";
export * from "./credits";
```

- [ ] **Step 8: Run tests, verify they pass**

```bash
npm test --workspace=@interview-helper/shared
```

Expected: all 9 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): credit math + types (TDD)"
```

---

## Task 3: Supabase schema migration

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_initial_schema.sql`

**Type:** Setup. Verify by running migration locally and inspecting tables.

- [ ] **Step 1: Init supabase project locally**

```bash
cd /Users/cgozdemm/interview-helper
supabase init
```

This creates `supabase/config.toml`. Edit it to set `project_id = "interview-helper"`.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0001_initial_schema.sql`:

```sql
-- USERS
create table public.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now(),
  device_fp   text,
  trial_used  boolean not null default false
);
create index users_device_fp_idx on public.users (device_fp);

-- CREDIT BALANCES (denormalized view of credit_txns; rebuilt by trigger)
create table public.credit_balances (
  user_id          uuid primary key references public.users(id) on delete cascade,
  balance          numeric(10,3) not null default 0,
  unlimited_until  timestamptz,
  updated_at       timestamptz not null default now()
);

-- CREDIT TXNS (source of truth)
create type public.txn_reason as enum ('purchase','usage','bonus','refund','grant');

create table public.credit_txns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  delta         numeric(10,3) not null,
  reason        public.txn_reason not null,
  stripe_event  text unique,                -- idempotency key for webhook
  session_id    uuid,
  created_at    timestamptz not null default now()
);
create index credit_txns_user_idx on public.credit_txns (user_id, created_at desc);

-- SESSIONS
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  credits_used  numeric(10,3) not null default 0,
  device        text not null
);
create index sessions_user_idx on public.sessions (user_id, started_at desc);

-- TRIGGER: rebuild credit_balances after every txn insert
create or replace function public.recompute_balance()
returns trigger language plpgsql as $$
begin
  insert into public.credit_balances (user_id, balance, updated_at)
  values (new.user_id, new.delta, now())
  on conflict (user_id) do update
    set balance = public.credit_balances.balance + new.delta,
        updated_at = now();
  return new;
end;
$$;

create trigger credit_txns_after_insert
  after insert on public.credit_txns
  for each row execute function public.recompute_balance();

-- ROW-LEVEL SECURITY: a user can read only their own rows
alter table public.users enable row level security;
alter table public.credit_balances enable row level security;
alter table public.credit_txns enable row level security;
alter table public.sessions enable row level security;

create policy users_self_read   on public.users           for select using (auth.uid() = id);
create policy bal_self_read     on public.credit_balances for select using (auth.uid() = user_id);
create policy txns_self_read    on public.credit_txns     for select using (auth.uid() = user_id);
create policy sessions_self_read on public.sessions       for select using (auth.uid() = user_id);

-- Edge functions use service-role key; RLS does not block them.
```

- [ ] **Step 3: Apply migration to a local Supabase**

```bash
supabase start    # boots local Postgres + Studio
supabase db reset # applies all migrations
```

- [ ] **Step 4: Verify schema**

```bash
supabase db dump --local --data-only=false | grep -E "^create (table|type|policy|trigger)"
```

Expected: 4 tables (users, credit_balances, credit_txns, sessions), 1 enum, 4 policies, 1 trigger.

- [ ] **Step 5: Smoke-test the trigger**

```bash
psql "$(supabase status -o env | grep DB_URL | cut -d'"' -f2)" -c "
  insert into public.users (id, email) values ('00000000-0000-0000-0000-000000000001','test@example.com');
  insert into public.credit_txns (user_id, delta, reason) values
    ('00000000-0000-0000-0000-000000000001', 0.500, 'grant');
  select balance from public.credit_balances where user_id = '00000000-0000-0000-0000-000000000001';
"
```

Expected: balance is `0.500`.

- [ ] **Step 6: Commit**

```bash
git add supabase
git commit -m "feat(db): initial schema — users, balances, txns, sessions"
```

---

## Task 4: JWT verification helper (TDD)

**Files:**
- Create: `supabase/functions/_shared/jwt.ts`
- Create: `supabase/functions/_shared/jwt.test.ts`

**Type:** TDD. Used by every protected endpoint, must be airtight.

- [ ] **Step 1: Write the failing test**

```ts
// supabase/functions/_shared/jwt.test.ts
import { assertEquals, assertRejects } from "https://deno.land/std@0.218.0/assert/mod.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { verifyJwt } from "./jwt.ts";

const SECRET = "test-secret-do-not-use-in-prod";

async function makeKey() {
  const enc = new TextEncoder().encode(SECRET);
  return await crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign","verify"]);
}

Deno.test("verifyJwt accepts a valid token", async () => {
  const key = await makeKey();
  const token = await create({ alg: "HS256", typ: "JWT" },
    { sub: "user-123", exp: getNumericDate(60 * 60) }, key);
  const claims = await verifyJwt(token, SECRET);
  assertEquals(claims.sub, "user-123");
});

Deno.test("verifyJwt rejects an expired token", async () => {
  const key = await makeKey();
  const token = await create({ alg: "HS256", typ: "JWT" },
    { sub: "user-123", exp: getNumericDate(-60) }, key);
  await assertRejects(() => verifyJwt(token, SECRET), Error, "expired");
});

Deno.test("verifyJwt rejects a token signed with the wrong secret", async () => {
  const key = await makeKey();
  const token = await create({ alg: "HS256", typ: "JWT" },
    { sub: "user-123", exp: getNumericDate(60 * 60) }, key);
  await assertRejects(() => verifyJwt(token, "different-secret"), Error);
});
```

- [ ] **Step 2: Run the test, verify it fails**

```bash
deno test supabase/functions/_shared/jwt.test.ts
```

Expected: fail with "module not found" — `jwt.ts` doesn't exist yet.

- [ ] **Step 3: Implement `_shared/jwt.ts`**

```ts
import { verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export interface Claims {
  sub: string;
  exp: number;
  email?: string;
}

export async function verifyJwt(token: string, secret: string): Promise<Claims> {
  const enc = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign","verify"],
  );
  return await verify(token, key) as Claims;
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test supabase/functions/_shared/jwt.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared
git commit -m "feat(api): jwt verification helper (TDD)"
```

---

## Task 5: Auth Edge Function — signup

**Files:**
- Create: `supabase/functions/auth-signup/index.ts`
- Create: `supabase/functions/auth-signup/index.test.ts`

**Type:** Integration test against local Supabase.

Behavior:
- POST `/auth-signup` with `{ email, password, device_fp }`
- Creates user via `auth.signUp`
- If `device_fp` is unseen (no other user with this fp), insert a `credit_txns` row with delta `0.167` (10 minutes), reason `grant`, and mark `users.trial_used = true`
- Return `{ access_token, refresh_token, user_id, balance }`

- [ ] **Step 1: Write the test**

```ts
// supabase/functions/auth-signup/index.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.218.0/assert/mod.ts";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";

Deno.test("signup creates user + grants 10-min trial credit on fresh device", async () => {
  const email = `t${crypto.randomUUID()}@example.com`;
  const r = await fetch(`${FN_URL}/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "p4ssword!", device_fp: "fresh-fp-" + crypto.randomUUID() }),
  });
  assertEquals(r.status, 200);
  const body = await r.json();
  assertExists(body.access_token);
  assertEquals(body.balance, "0.167");
});

Deno.test("signup with reused device_fp grants no trial credit", async () => {
  const fp = "shared-fp-" + crypto.randomUUID();
  // first signup gets the trial
  await fetch(`${FN_URL}/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `a${crypto.randomUUID()}@example.com`, password: "p4ssword!", device_fp: fp }),
  });
  // second signup on same fp does NOT
  const r = await fetch(`${FN_URL}/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `b${crypto.randomUUID()}@example.com`, password: "p4ssword!", device_fp: fp }),
  });
  assertEquals(r.status, 200);
  const body = await r.json();
  assertEquals(body.balance, "0.000");
});
```

- [ ] **Step 2: Boot Supabase + run test, verify it fails**

```bash
supabase start
supabase functions serve auth-signup --no-verify-jwt &
deno test --allow-net supabase/functions/auth-signup/index.test.ts
```

Expected: fail — function returns 404.

- [ ] **Step 3: Implement `auth-signup/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface Req { email: string; password: string; device_fp: string }

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body: Req;
  try { body = await req.json(); } catch { return jerr(400, "bad-json"); }
  if (!body.email || !body.password || !body.device_fp) return jerr(400, "missing-fields");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. create auth user
  const { data: signUpRes, error: signUpErr } = await sb.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  });
  if (signUpErr) return jerr(400, signUpErr.message);
  const userId = signUpRes.user.id;

  // 2. has this device_fp been seen before?
  const { count } = await sb.from("users").select("id", { count: "exact", head: true })
    .eq("device_fp", body.device_fp);
  const fpSeen = (count ?? 0) > 0;

  // 3. insert into our own users table
  await sb.from("users").insert({
    id: userId,
    email: body.email,
    device_fp: body.device_fp,
    trial_used: !fpSeen,
  });

  // 4. grant 10-min trial credit if fresh device
  let balance = "0.000";
  if (!fpSeen) {
    await sb.from("credit_txns").insert({ user_id: userId, delta: 0.167, reason: "grant" });
    balance = "0.167";
  }

  // 5. mint a session token (signInWithPassword reuses Supabase auth's JWT signer)
  const { data: signInRes } = await sb.auth.signInWithPassword({
    email: body.email, password: body.password,
  });

  return Response.json({
    access_token: signInRes?.session?.access_token,
    refresh_token: signInRes?.session?.refresh_token,
    user_id: userId,
    balance,
  });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 4: Run tests, verify they pass**

```bash
deno test --allow-net supabase/functions/auth-signup/index.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/auth-signup
git commit -m "feat(api): auth-signup with anti-abuse trial grant"
```

---

## Task 6: Auth Edge Function — login

**Files:**
- Create: `supabase/functions/auth-login/index.ts`
- Create: `supabase/functions/auth-login/index.test.ts`

**Type:** Integration test.

Behavior: POST `/auth-login` with `{ email, password }` → returns `{ access_token, refresh_token, balance }`. Returns 401 on bad credentials.

- [ ] **Step 1: Write the test**

```ts
// supabase/functions/auth-login/index.test.ts
import { assertEquals, assertExists } from "https://deno.land/std@0.218.0/assert/mod.ts";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";

async function signup(email: string) {
  const r = await fetch(`${FN_URL}/auth-signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "p4ssword!", device_fp: "x" + crypto.randomUUID() }),
  });
  return await r.json();
}

Deno.test("login returns tokens + current balance for valid credentials", async () => {
  const email = `l${crypto.randomUUID()}@example.com`;
  await signup(email);
  const r = await fetch(`${FN_URL}/auth-login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "p4ssword!" }),
  });
  assertEquals(r.status, 200);
  const body = await r.json();
  assertExists(body.access_token);
  assertEquals(body.balance, "0.167");
});

Deno.test("login returns 401 for wrong password", async () => {
  const email = `l${crypto.randomUUID()}@example.com`;
  await signup(email);
  const r = await fetch(`${FN_URL}/auth-login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "wrong" }),
  });
  assertEquals(r.status, 401);
});
```

- [ ] **Step 2: Run, verify it fails**

Expected: 404, function not deployed.

- [ ] **Step 3: Implement `auth-login/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return jerr(400, "bad-json"); }
  if (!body.email || !body.password) return jerr(400, "missing-fields");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await sb.auth.signInWithPassword({
    email: body.email, password: body.password,
  });
  if (error || !data.session) return jerr(401, "invalid-credentials");

  const { data: bal } = await sb.from("credit_balances").select("balance")
    .eq("user_id", data.user!.id).single();

  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    balance: bal?.balance ?? "0.000",
  });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 4: Run tests, verify they pass**

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/auth-login
git commit -m "feat(api): auth-login returns tokens + balance"
```

---

## Task 7: Stripe products configuration script

**Files:**
- Create: `scripts/stripe-bootstrap.ts`
- Modify: `.env.example` (add `STRIPE_PRICE_STARTER`)

**Type:** Setup script. Verify by running once against a Stripe test account.

- [ ] **Step 1: Write the bootstrap script**

```ts
// scripts/stripe-bootstrap.ts
// Run once: deno run --allow-env --allow-net scripts/stripe-bootstrap.ts
// Creates the Starter $29 product + price in your Stripe test account.
// Prints the price id so you can paste into .env as STRIPE_PRICE_STARTER.

import Stripe from "https://esm.sh/stripe@14.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
});

const product = await stripe.products.create({
  name: "Starter — 3 credits",
  description: "3 hours of interview-helper usage. Credits never expire.",
  metadata: { sku: "starter" },
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900,
  currency: "usd",
  metadata: { credits: "3" },
});

console.log("STRIPE_PRICE_STARTER=" + price.id);
```

- [ ] **Step 2: Run it once**

```bash
export STRIPE_SECRET_KEY=sk_test_xxx  # from Stripe dashboard
deno run --allow-env --allow-net scripts/stripe-bootstrap.ts
```

Expected output: `STRIPE_PRICE_STARTER=price_1NxxxxxxxxxxxxxxxxxxxxxX`

- [ ] **Step 3: Save the price id to your local `.env`** (NOT committed)

- [ ] **Step 4: Commit the script** (no `.env` changes committed)

```bash
git add scripts/stripe-bootstrap.ts .env.example
git commit -m "chore(stripe): bootstrap script for Starter product"
```

---

## Task 8: Billing checkout Edge Function

**Files:**
- Create: `supabase/functions/billing-checkout/index.ts`
- Create: `supabase/functions/billing-checkout/index.test.ts`
- Create: `supabase/functions/_shared/stripe.ts`

**Type:** Integration test (mocks Stripe via env-driven price id).

Behavior: POST `/billing-checkout` with `Authorization: Bearer <jwt>` and body `{ sku: "starter" }` → returns `{ url }` (Stripe Checkout Session URL).

- [ ] **Step 1: Write `_shared/stripe.ts`**

```ts
// supabase/functions/_shared/stripe.ts
import Stripe from "https://esm.sh/stripe@14.0.0";

export function stripeClient() {
  return new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-04-10",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export const SKU_TO_PRICE_ENV: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER",
};
```

- [ ] **Step 2: Write the test**

```ts
// supabase/functions/billing-checkout/index.test.ts
import { assertEquals, assertMatch } from "https://deno.land/std@0.218.0/assert/mod.ts";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";

async function signupAndGetToken() {
  const email = `c${crypto.randomUUID()}@example.com`;
  const r = await fetch(`${FN_URL}/auth-signup`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "p4ssword!", device_fp: "fp" + crypto.randomUUID() }),
  });
  return (await r.json()).access_token;
}

Deno.test("checkout returns a Stripe URL for an authenticated user", async () => {
  const token = await signupAndGetToken();
  const r = await fetch(`${FN_URL}/billing-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sku: "starter" }),
  });
  assertEquals(r.status, 200);
  const body = await r.json();
  assertMatch(body.url, /^https:\/\/checkout\.stripe\.com\//);
});

Deno.test("checkout requires Authorization", async () => {
  const r = await fetch(`${FN_URL}/billing-checkout`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku: "starter" }),
  });
  assertEquals(r.status, 401);
});

Deno.test("checkout rejects unknown sku", async () => {
  const token = await signupAndGetToken();
  const r = await fetch(`${FN_URL}/billing-checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sku: "bogus" }),
  });
  assertEquals(r.status, 400);
});
```

- [ ] **Step 3: Run, verify it fails**

- [ ] **Step 4: Implement `billing-checkout/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { stripeClient, SKU_TO_PRICE_ENV } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return jerr(401, "missing-token");
  const jwt = auth.slice(7);

  let body;
  try { body = await req.json(); } catch { return jerr(400, "bad-json"); }
  const sku = String(body.sku || "");
  const priceEnv = SKU_TO_PRICE_ENV[sku];
  if (!priceEnv) return jerr(400, "unknown-sku");
  const priceId = Deno.env.get(priceEnv);
  if (!priceId) return jerr(500, "missing-price-config");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return jerr(401, "invalid-token");

  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "https://app.interview-helper.example/success",
    cancel_url: "https://app.interview-helper.example/canceled",
    customer_email: user.email,
    metadata: { user_id: user.id, sku },
  });

  return Response.json({ url: session.url });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 5: Run tests, verify they pass**

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/billing-checkout supabase/functions/_shared/stripe.ts
git commit -m "feat(api): billing-checkout creates Stripe Checkout session"
```

---

## Task 9: Billing webhook Edge Function

**Files:**
- Create: `supabase/functions/billing-webhook/index.ts`
- Create: `supabase/functions/billing-webhook/index.test.ts`

**Type:** Integration test using Stripe-style signed payload.

Behavior:
- POST `/billing-webhook` with `Stripe-Signature` header
- Verifies signature against `STRIPE_WEBHOOK_SECRET`
- On `checkout.session.completed`: read `metadata.user_id`, `metadata.sku`, look up credits for sku, insert `credit_txns` row with `stripe_event = event.id` (idempotent)
- Returns 200 even on duplicate events (the unique constraint on `stripe_event` handles dedupe)

- [ ] **Step 1: Write the test**

```ts
// supabase/functions/billing-webhook/index.test.ts
import { assertEquals } from "https://deno.land/std@0.218.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

async function signPayload(payload: string, secret: string, ts: number): Promise<string> {
  const enc = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey("raw", enc, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}.${payload}`));
  return `t=${ts},v1=${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,"0")).join("")}`;
}

Deno.test("webhook credits user on checkout.session.completed", async () => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  // create a user
  const userId = crypto.randomUUID();
  await sb.from("users").insert({ id: userId, email: `w${userId}@e.com` });

  const eventId = `evt_test_${crypto.randomUUID()}`;
  const payload = JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: { object: { metadata: { user_id: userId, sku: "starter" } } },
  });
  const ts = Math.floor(Date.now() / 1000);
  const sig = await signPayload(payload, WEBHOOK_SECRET, ts);

  const r = await fetch(`${FN_URL}/billing-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body: payload,
  });
  assertEquals(r.status, 200);

  const { data: bal } = await sb.from("credit_balances").select("balance").eq("user_id", userId).single();
  assertEquals(bal?.balance, "3.000");

  // duplicate event is idempotent
  const r2 = await fetch(`${FN_URL}/billing-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": sig },
    body: payload,
  });
  assertEquals(r2.status, 200);
  const { data: bal2 } = await sb.from("credit_balances").select("balance").eq("user_id", userId).single();
  assertEquals(bal2?.balance, "3.000");  // not 6.000 — idempotent
});

Deno.test("webhook rejects bad signature", async () => {
  const r = await fetch(`${FN_URL}/billing-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": "t=0,v1=deadbeef" },
    body: "{}",
  });
  assertEquals(r.status, 400);
});
```

- [ ] **Step 2: Run, verify it fails**

- [ ] **Step 3: Implement `billing-webhook/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { stripeClient } from "../_shared/stripe.ts";

const SKU_CREDITS: Record<string, number> = {
  starter: 3,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const sig = req.headers.get("Stripe-Signature");
  if (!sig) return jerr(400, "missing-signature");

  const raw = await req.text();
  const stripe = stripeClient();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (e) {
    return jerr(400, `bad-signature: ${e.message}`);
  }

  if (event.type !== "checkout.session.completed") {
    return Response.json({ ignored: event.type });  // not an error
  }

  const session = event.data.object as { metadata?: { user_id?: string; sku?: string } };
  const userId = session.metadata?.user_id;
  const sku = session.metadata?.sku;
  if (!userId || !sku) return jerr(400, "missing-metadata");
  const credits = SKU_CREDITS[sku];
  if (!credits) return jerr(400, "unknown-sku");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Insert; the unique constraint on stripe_event makes this idempotent.
  const { error } = await sb.from("credit_txns").insert({
    user_id: userId,
    delta: credits,
    reason: "purchase",
    stripe_event: event.id,
  });
  if (error && !error.message.includes("duplicate")) {
    return jerr(500, error.message);
  }

  return Response.json({ ok: true });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 4: Run tests, verify they pass**

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/billing-webhook
git commit -m "feat(api): billing-webhook with idempotent credit grant"
```

---

## Task 10: Marketing site — Landing page + waitlist

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/Landing.tsx`
- Create: `apps/web/src/api.ts`
- Create: `apps/web/tests/api.test.ts`

**Type:** TDD for `api.ts` (the only logic). Landing page is mostly markup; verify by running.

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@interview-helper/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts` and `index.html`**

```ts
// apps/web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });
```

```html
<!-- apps/web/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Interview Helper — Real-time AI for video interviews</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: Write the failing test for `api.ts`**

```ts
// apps/web/tests/api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinWaitlist } from "../src/api";

describe("joinWaitlist", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("POSTs to the signup endpoint with the supplied email and a generated device_fp", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ access_token: "x", balance: "0.167" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await joinWaitlist("user@test.com");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/auth-signup$/);
    const body = JSON.parse(init.body);
    expect(body.email).toBe("user@test.com");
    expect(body.device_fp).toMatch(/^[a-f0-9-]{36}$/);
  });

  it("throws when fetch returns non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "bad-email" }) }));
    await expect(joinWaitlist("x")).rejects.toThrow(/bad-email/);
  });
});
```

- [ ] **Step 4: Run, verify it fails** (`api.ts` doesn't exist)

- [ ] **Step 5: Implement `apps/web/src/api.ts`**

```ts
// apps/web/src/api.ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:54321/functions/v1";

function devicefp(): string {
  // Phase 1: random uuid stored in localStorage. Phase 4 replaces this with
  // a real fingerprint (canvas + audio + timezone hash).
  let fp = localStorage.getItem("device_fp");
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem("device_fp", fp);
  }
  return fp;
}

export async function joinWaitlist(email: string): Promise<{ access_token: string; balance: string }> {
  const r = await fetch(`${API_BASE}/auth-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: crypto.randomUUID(), device_fp: devicefp() }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `http-${r.status}`);
  return body;
}
```

- [ ] **Step 6: Run tests, verify they pass**

- [ ] **Step 7: Implement `Landing.tsx` and `main.tsx`**

```tsx
// apps/web/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./Landing";
createRoot(document.getElementById("root")!).render(<Landing />);
```

```tsx
// apps/web/src/Landing.tsx
import { useState } from "react";
import { joinWaitlist } from "./api";

export function Landing() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try { await joinWaitlist(email); setState("done"); }
    catch (e: any) { setErr(e.message); setState("error"); }
  };

  return (
    <main style={{ maxWidth: 720, margin: "80px auto", fontFamily: "system-ui", padding: 24 }}>
      <h1 style={{ fontSize: 48, lineHeight: 1.05, fontWeight: 700 }}>
        Real-time AI for your next video interview.
      </h1>
      <p style={{ fontSize: 18, color: "#444", marginTop: 16 }}>
        Invisible during screen-share. Specialized for data roles. 10 minutes free, no card.
      </p>
      {state === "done" ? (
        <p style={{ color: "green", marginTop: 32 }}>You're in. Check your email for the download link.</p>
      ) : (
        <form onSubmit={submit} style={{ marginTop: 32, display: "flex", gap: 8 }}>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            style={{ flex: 1, padding: 14, fontSize: 16, border: "1px solid #ccc", borderRadius: 8 }}
          />
          <button type="submit" disabled={state === "loading"}
            style={{ padding: "14px 24px", fontSize: 16, background: "black", color: "white", border: 0, borderRadius: 8 }}>
            {state === "loading" ? "..." : "Get early access"}
          </button>
        </form>
      )}
      {state === "error" && <p style={{ color: "crimson" }}>{err}</p>}
    </main>
  );
}
```

- [ ] **Step 8: Run dev server, verify in browser**

```bash
cd apps/web && npm run dev
```

Open http://localhost:5173, enter an email, submit. Expected: success message; `select * from users` shows the new user.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): landing page + waitlist signup"
```

---

## Task 11: Electron app skeleton

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/App.tsx`

**Type:** Setup. Verify by running.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@interview-helper/desktop",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@electron/rebuild": "^3.6.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^31.0.0",
    "electron-vite": "^2.3.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write `electron.vite.config.ts`**

```ts
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: { build: { outDir: "out/main" } },
  preload: { build: { outDir: "out/preload" } },
  renderer: {
    plugins: [react()],
    build: { outDir: "out/renderer" },
  },
});
```

- [ ] **Step 3: Write `src/main/index.ts` (boots the app, defers window creation to Task 12)**

```ts
import { app } from "electron";
import { createOverlayWindow } from "./window";

app.whenReady().then(() => {
  createOverlayWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 4: Write `src/preload/index.ts`** (empty stub for Phase 1; preload bridge expanded in Phase 2)

```ts
// preload bridge — populated in Phase 2 (capture IPC, hotkey events)
import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("ih", { phase: 1 });
```

- [ ] **Step 5: Write renderer scaffold**

```html
<!-- apps/desktop/src/renderer/index.html -->
<!doctype html>
<html><head><meta charset="utf-8"><title>Interview Helper</title>
<style>body{margin:0;background:transparent;font-family:system-ui;color:#fff;}</style>
</head><body><div id="root"></div>
<script type="module" src="./main.tsx"></script></body></html>
```

```tsx
// apps/desktop/src/renderer/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
createRoot(document.getElementById("root")!).render(<App />);
```

```tsx
// apps/desktop/src/renderer/App.tsx
export function App() {
  return (
    <div style={{
      position: "fixed", bottom: 12, right: 12, padding: "6px 14px",
      background: "rgba(22,22,26,0.85)", border: "1px solid rgba(255,227,77,0.35)",
      borderRadius: 999, fontSize: 12, color: "#fff", display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{ width: 6, height: 6, background: "#7ed492", borderRadius: 4 }} />
      ready · phase 1
    </div>
  );
}
```

- [ ] **Step 6: Commit (window creation comes in Task 12)**

```bash
git add apps/desktop
git commit -m "feat(desktop): Electron skeleton + placeholder overlay UI"
```

---

## Task 12: Content protection on overlay window (TDD-ish)

**Files:**
- Create: `apps/desktop/src/main/window.ts`
- Create: `apps/desktop/tests/window.test.ts`

**Type:** Logic test on the window factory's options object (we can't actually test "the OS doesn't capture this" in unit tests — that's manual stealth verification later).

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/tests/window.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  BrowserWindow: vi.fn().mockImplementation((opts) => ({
    __opts: opts,
    setContentProtection: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    loadFile: vi.fn(),
    loadURL: vi.fn(),
    webContents: { on: vi.fn() },
  })),
  app: { getAppPath: () => "/app", isPackaged: false },
}));

import { createOverlayWindow } from "../src/main/window";
import { BrowserWindow } from "electron";

describe("createOverlayWindow", () => {
  it("creates a frameless, transparent, always-on-top window with content protection ON", () => {
    const win = createOverlayWindow() as any;
    const opts = win.__opts;
    expect(opts.frame).toBe(false);
    expect(opts.transparent).toBe(true);
    expect(opts.alwaysOnTop).toBe(true);
    expect(opts.skipTaskbar).toBe(true);
    expect(opts.resizable).toBe(true);
    expect(win.setContentProtection).toHaveBeenCalledWith(true);
    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, "screen-saver");
  });
});
```

- [ ] **Step 2: Run, verify it fails**

- [ ] **Step 3: Implement `src/main/window.ts`**

```ts
import { BrowserWindow, app } from "electron";
import path from "node:path";

export function createOverlayWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 60,
    x: undefined,            // Phase 2 places it relative to active display
    y: undefined,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out/preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Tier-2 stealth, the load-bearing line of Phase 1:
  win.setContentProtection(true);
  win.setAlwaysOnTop(true, "screen-saver");

  if (app.isPackaged) {
    win.loadFile(path.join(app.getAppPath(), "out/renderer/index.html"));
  } else {
    win.loadURL("http://localhost:5173");
  }

  return win;
}
```

- [ ] **Step 4: Run tests, verify they pass**

- [ ] **Step 5: Manual stealth smoke-test**

```bash
cd apps/desktop && npm run dev
```

Then in another terminal: `screencapture /tmp/screen.png && open /tmp/screen.png`. Expected: where the overlay would be on screen, the captured PNG shows a black rectangle (or the desktop behind, depending on macOS version) — never the actual UI text.

If you see "ready · phase 1" in the screenshot, content protection isn't working — check that `setContentProtection(true)` ran.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/main/window.ts apps/desktop/tests/window.test.ts
git commit -m "feat(desktop): content-protected overlay window"
```

---

## Task 13: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Type:** Setup. Verify by pushing the branch and watching the Actions run.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm test --workspaces --if-present
      - run: npm run build --workspace=@interview-helper/web

  deno-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with: { deno-version: 'v1.x' }
      - name: Test JWT helper (no network needed)
        run: deno test supabase/functions/_shared/jwt.test.ts
```

Note: the Edge Function integration tests (Tasks 5, 6, 8, 9) need a running Supabase local stack and are not run in CI in Phase 1 — they're run manually before each commit. Phase 4 will add a CI job that boots `supabase start` and runs the full integration suite.

- [ ] **Step 2: Push and verify**

```bash
gh repo create interview-helper --private --source=. --push
```

Expected: GitHub repo created, workflow runs green on the first push.

- [ ] **Step 3: Commit (already pushed)**

The workflow file is already in the repo from step 1. Confirm it ran by:

```bash
gh run list --limit 1
```

Expected: status `success`.

---

## Phase 1 wrap-up checklist

- [ ] All 13 tasks committed
- [ ] CI green on `main`
- [ ] `npm test --workspaces` reports 0 failures
- [ ] Local `apps/web` dev server collects waitlist signups (verified manually)
- [ ] Local `apps/desktop` dev server opens overlay; `screencapture` shows black rectangle where overlay sits
- [ ] Stripe Checkout URL is reachable from `billing-checkout`; webhook test event credits 3.000 to a user
- [ ] Reviewer-confirmed clean Phase 1 — ready for Phase 2 (capture engine + LLM brain)

---

## Notes for the executing engineer

1. **Decimal arithmetic is non-negotiable for credit math.** Never use JavaScript `number` for balances — use `decimal.js` strings end-to-end. Phase 1 sets the precedent (`packages/shared/credits.ts`); break it at your peril.

2. **The `stripe_event` unique constraint is the entire idempotency story.** Don't replace it with application-level dedup. Postgres does this better and atomically.

3. **Content protection must be the first thing that runs after `BrowserWindow` construction.** Before any URL load, before `show()`. If you reorder this, you can leak a frame to the OS capture pipeline.

4. **Edge Functions return JSON for both success and failure.** Don't throw raw errors back to clients — they leak server internals. Use the `jerr()` helper everywhere.

5. **Phase 1 only wires the Starter SKU.** Plus / Power / Monthly / Lifetime are Phase 4. Don't pre-build them — they may need different handling once we see real Stripe data.

6. **What's deliberately omitted from Phase 1:** real device fingerprinting (Phase 4), forced-update flag (Phase 3), Paddle (Phase 4 dormant wire-up), telemetry (never — see spec privacy section).
