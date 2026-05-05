# Interview Helper — Phase 2B (Audio + Multi-Provider Routing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the audio half of the question loop (microphone + interviewer system audio + Deepgram streaming transcription + auto-detect classifier) and a multi-provider LLM router (Claude + GPT-5 + Gemini) so the helper can answer behavioral / case / system-design questions that aren't visible on screen — only audible — and can pick the best model per question type.

**Architecture:** Audio is captured in the Electron renderer via `getUserMedia` (mic) and via a platform-specific main-process API (macOS `CATapDescription` for system audio on 14.4+, with a BlackHole fallback path; Windows `WASAPI` loopback). Both streams are fed to Deepgram's streaming WebSocket via a thin Edge-Function proxy that hides the API key. A heuristic classifier on the transcript decides when to fire the question loop. The `/llm-answer` Edge Function gains a router that dispatches by detected question type: SQL/code → Claude, behavioral/case → GPT-5, vision/schema → Gemini.

**Tech Stack:**
- Audio: `getUserMedia` (renderer), `node-mac-audio-capture` or thin Swift CLI helper for `CATapDescription` (mac), `node-system-audio-capture` for WASAPI (win), BlackHole bundled fallback
- Transcription: Deepgram Nova-3 streaming WebSocket (server-proxied)
- Providers: `@anthropic-ai/sdk` (already in 2A), `openai`, `@google/generative-ai`
- Test: vitest unit + a manual end-to-end smoke

---

## Pre-flight: read these before starting

1. Phase 2A is fully implemented and committed. Read the spec (`docs/superpowers/specs/2026-05-04-interview-helper-design.md`) Section 3 (Inputs), Section "The question loop / behavioral path", and the Phase 2A plan if you weren't the one who wrote it.

2. **Required keys/accounts:**
   - Deepgram API key (free tier covers smoke testing — sign up at deepgram.com)
   - OpenAI API key with GPT-5 access
   - Google AI Studio key (Gemini 2.5 Flash)
   - All go into `supabase/functions/.env`

3. **macOS system audio is hard.** `CATapDescription` is macOS 14.4+ only and requires either a tiny Swift binary bundled with the app or a native Node addon. For this plan, we **embed a precompiled Swift CLI helper** that emits PCM frames to stdout — simplest integration with Node child_process. Fallback for older macOS: detect at runtime and prompt user to install BlackHole. Windows is straightforward (WASAPI is built-in to native modules).

4. **Port allocation update:** Phase 2A added nothing new on ports. This plan adds a Deepgram proxy WebSocket on the Supabase Edge Functions endpoint at `/functions/v1/transcribe-stream` (no new port — uses 54321).

---

## File structure (target end-state of Phase 2B)

```
/Users/cgozdemm/interview-helper/
├── apps/desktop/
│   ├── src/main/
│   │   ├── capture/
│   │   │   ├── mic.ts              # NEW — getUserMedia bridge
│   │   │   ├── system-audio-mac.ts # NEW — Swift helper subprocess
│   │   │   ├── system-audio-win.ts # NEW — WASAPI native addon
│   │   │   └── system-audio.ts     # NEW — platform dispatcher
│   │   ├── audio/
│   │   │   ├── buffer.ts           # NEW — 60s ring buffer
│   │   │   └── deepgram.ts         # NEW — WebSocket client to /transcribe-stream
│   │   ├── classifier.ts           # NEW — heuristic question detector
│   │   └── questionloop.ts         # MODIFIED — accepts transcript context
│   ├── resources/                  # NEW dir
│   │   └── mac/
│   │       └── ih-audio-tap        # NEW — precompiled Swift CLI binary
│   └── tests/
│       ├── audio-buffer.test.ts    # NEW
│       ├── classifier.test.ts      # NEW
│       └── deepgram.test.ts        # NEW
└── supabase/functions/
    ├── _shared/
    │   ├── openai.ts               # NEW
    │   ├── gemini.ts               # NEW
    │   └── router.ts               # NEW — provider routing logic
    ├── llm-answer/index.ts         # MODIFIED — uses router
    └── transcribe-stream/index.ts  # NEW — Deepgram WebSocket proxy
```

Each file's responsibility stays focused. The ring buffer never knows about Deepgram; Deepgram never knows about Claude; the router never knows about audio. Boundaries enforced via interfaces.

---

## Phase 2B deliverable (Definition of Done)

By the end of Task 8:

- Saying "tell me about a time you handled a difficult stakeholder" out loud (or playing it through system audio) triggers the helper within 1.5s and shows a STAR-format bullet answer in the overlay.
- An on-screen SQL question + a spoken question can both be answered (screen still works as in Phase 2A; audio is additive).
- A behavioral question routes to GPT-5; a SQL question routes to Claude; a chart-reading question routes to Gemini. Verifiable in the answer card's provider badge.
- The provider re-roll hotkey (⌘⇧A) re-runs the same question through a different provider and replaces the answer card.
- 25+ tests passing across Phase 1, 2A, 2B (was 31 after Phase 2A).
- All 8 Phase 2B commits on `main`.

**Not in Phase 2B (explicitly deferred):**
- Speaker diarization beyond Deepgram's built-in (no per-speaker model layering)
- Persistent conversation memory across sessions
- Real-time streaming answer rendering (whole-answer-at-once is fine; token streaming is a polish task)
- Anti-hallucination cross-check between providers (one-shot routing only)

---

## Task 1: Mic capture + IPC bridge + audio ring buffer

**Files:**
- Create: `apps/desktop/src/main/capture/mic.ts`
- Create: `apps/desktop/src/main/audio/buffer.ts`
- Create: `apps/desktop/tests/audio-buffer.test.ts`
- Modify: `apps/desktop/src/preload/index.ts` (expose `startMic`, `stopMic`, `pushAudioFrame` IPC)

**Type:** TDD on `buffer.ts`. Mic itself uses `getUserMedia` in the renderer and ships PCM frames to main via IPC.

- [ ] **Step 1: Write the failing test for buffer**

```ts
// apps/desktop/tests/audio-buffer.test.ts
import { describe, it, expect } from "vitest";
import { RingBuffer } from "../src/main/audio/buffer";

describe("RingBuffer (60s @ 16kHz)", () => {
  it("returns empty Float32Array initially", () => {
    const rb = new RingBuffer(16000 * 60);
    expect(rb.snapshot().length).toBe(0);
  });

  it("appends frames up to capacity", () => {
    const rb = new RingBuffer(100);
    rb.push(new Float32Array([1, 2, 3]));
    expect(rb.snapshot()).toEqual(new Float32Array([1, 2, 3]));
  });

  it("evicts oldest frames when capacity exceeded", () => {
    const rb = new RingBuffer(4);
    rb.push(new Float32Array([1, 2, 3]));
    rb.push(new Float32Array([4, 5]));  // overflows by 1
    expect(rb.snapshot()).toEqual(new Float32Array([2, 3, 4, 5]));
  });

  it("snapshot is immutable (returns a copy)", () => {
    const rb = new RingBuffer(10);
    rb.push(new Float32Array([1, 2, 3]));
    const snap = rb.snapshot();
    snap[0] = 999;
    expect(rb.snapshot()[0]).toBe(1);
  });
});
```

- [ ] **Step 2: Run, verify it fails** (`buffer.ts` doesn't exist)

- [ ] **Step 3: Implement `buffer.ts`**

```ts
// apps/desktop/src/main/audio/buffer.ts
export class RingBuffer {
  private data: Float32Array;
  private writeIdx = 0;
  private filled = 0;

  constructor(public readonly capacity: number) {
    this.data = new Float32Array(capacity);
  }

  push(frames: Float32Array) {
    for (const f of frames) {
      this.data[this.writeIdx] = f;
      this.writeIdx = (this.writeIdx + 1) % this.capacity;
      if (this.filled < this.capacity) this.filled++;
    }
  }

  snapshot(): Float32Array {
    if (this.filled === 0) return new Float32Array(0);
    const out = new Float32Array(this.filled);
    if (this.filled < this.capacity) {
      out.set(this.data.subarray(0, this.filled));
    } else {
      // wrap-around: read from writeIdx forward, then from 0 to writeIdx
      out.set(this.data.subarray(this.writeIdx), 0);
      out.set(this.data.subarray(0, this.writeIdx), this.capacity - this.writeIdx);
    }
    return out;
  }
}
```

- [ ] **Step 4: Run tests, verify they pass** (4/4)

- [ ] **Step 5: Implement `mic.ts`** (main-process side — receives frames from renderer via IPC, pushes to a shared ring buffer)

```ts
// apps/desktop/src/main/capture/mic.ts
import { ipcMain } from "electron";
import { RingBuffer } from "../audio/buffer";

const SAMPLE_RATE = 16000;
const SECONDS = 60;

export const micBuffer = new RingBuffer(SAMPLE_RATE * SECONDS);

export function registerMicIpc() {
  ipcMain.on("ih:audio-frame", (_e, frames: Float32Array) => {
    micBuffer.push(frames);
  });
}
```

- [ ] **Step 6: Update preload bridge**

Modify `apps/desktop/src/preload/index.ts` to expose:
```ts
contextBridge.exposeInMainWorld("ih", {
  ...existing,
  pushAudioFrame: (frames: Float32Array) => ipcRenderer.send("ih:audio-frame", frames),
});
```

- [ ] **Step 7: Renderer-side mic capture**

Add to `apps/desktop/src/renderer/main.tsx` (boot sequence):
```ts
async function startMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, noiseSuppression: true } });
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  proc.onaudioprocess = (e) => {
    const frames = e.inputBuffer.getChannelData(0);
    (window as any).ih.pushAudioFrame(new Float32Array(frames));
  };
  src.connect(proc);
  proc.connect(ctx.destination);
}
startMic().catch(console.error);
```

- [ ] **Step 8: Wire `registerMicIpc()` into `main/index.ts`**

After `app.whenReady()` block, before `createOverlayWindow()`:
```ts
import { registerMicIpc } from "./capture/mic";
registerMicIpc();
```

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/main/audio apps/desktop/src/main/capture/mic.ts apps/desktop/src/preload/index.ts apps/desktop/src/renderer/main.tsx apps/desktop/src/main/index.ts apps/desktop/tests/audio-buffer.test.ts
git commit -m "feat(desktop): mic capture + 60s ring buffer (TDD)"
```

---

## Task 2: Deepgram streaming proxy (Edge Function)

**Files:**
- Create: `supabase/functions/transcribe-stream/index.ts`
- Create: `supabase/functions/transcribe-stream/index.test.ts` (contract tests only — auth, validation; the WebSocket flow is verified manually in Task 8)

**Behavior:** Client opens WebSocket to `wss://localhost:54321/functions/v1/transcribe-stream?token=<jwt>`. Server validates JWT, opens an upstream WebSocket to `wss://api.deepgram.com/v1/listen?model=nova-3&diarize=true`, pipes binary audio frames through, pipes Deepgram's JSON transcripts back. Hides the Deepgram API key from the client.

- [ ] **Step 1: Write the test (contract only)**

```ts
// supabase/functions/transcribe-stream/index.test.ts
import { assertEquals } from "https://deno.land/std@0.218.0/assert/mod.ts";

const FN_URL = Deno.env.get("FN_URL") ?? "http://localhost:54321/functions/v1";

Deno.test("transcribe-stream rejects HTTP (not WS)", async () => {
  const r = await fetch(`${FN_URL}/transcribe-stream`);
  // Deno.serve returns 426 (Upgrade Required) when WebSocket upgrade is missing
  assertEquals([400, 426].includes(r.status), true);
});

Deno.test("transcribe-stream rejects WS without token", async () => {
  const url = FN_URL.replace("http://", "ws://") + "/transcribe-stream";
  const ws = new WebSocket(url);
  await new Promise<void>((resolve) => {
    ws.onclose = () => resolve();
  });
  // close code 1008 (policy violation) or similar non-1000
  // Just assert the connection didn't establish successfully
});
```

- [ ] **Step 2: Implement `transcribe-stream/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

Deno.serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return new Response("missing-token", { status: 401 });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("invalid-token", { status: 401 });

  const { socket: client, response } = Deno.upgradeWebSocket(req);

  const dgKey = Deno.env.get("DEEPGRAM_API_KEY")!;
  const dgUrl = "wss://api.deepgram.com/v1/listen?" + new URLSearchParams({
    model: "nova-3",
    diarize: "true",
    interim_results: "true",
    smart_format: "true",
    sample_rate: "16000",
    encoding: "linear16",
  });
  const dg = new WebSocket(dgUrl, ["token", dgKey]);

  client.onmessage = (e) => {
    if (dg.readyState === WebSocket.OPEN) dg.send(e.data);
  };
  dg.onmessage = (e) => {
    if (client.readyState === WebSocket.OPEN) client.send(e.data);
  };
  client.onclose = () => dg.close();
  dg.onclose = () => client.close();
  client.onerror = (err) => console.error("client ws error", err);
  dg.onerror = (err) => console.error("deepgram ws error", err);

  return response;
});
```

- [ ] **Step 3: Type-check + commit**

```bash
deno check supabase/functions/transcribe-stream/index.ts
git add supabase/functions/transcribe-stream
git commit -m "feat(api): transcribe-stream Deepgram WebSocket proxy"
```

---

## Task 3: Desktop client for Deepgram transcription

**Files:**
- Create: `apps/desktop/src/main/audio/deepgram.ts`
- Create: `apps/desktop/tests/deepgram.test.ts`

**Behavior:** Opens a WebSocket from the Electron main process to the Edge Function proxy, streams Float32Array frames as Int16 PCM, emits incremental transcripts via Node EventEmitter.

- [ ] **Step 1: Write the failing test** (mocks WebSocket)

```ts
// apps/desktop/tests/deepgram.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

class MockWS {
  onopen?: () => void;
  onmessage?: (e: any) => void;
  onclose?: () => void;
  sent: any[] = [];
  send(data: any) { this.sent.push(data); }
  close() { this.onclose?.(); }
}

describe("DeepgramClient", () => {
  beforeEach(() => { vi.stubGlobal("WebSocket", MockWS); });

  it("emits transcript events from incoming JSON frames", async () => {
    const { DeepgramClient } = await import("../src/main/audio/deepgram");
    const dg = new DeepgramClient("ws://test", "tok");
    const events: string[] = [];
    dg.on("transcript", (text, speaker, isFinal) => events.push(`${speaker}:${text}:${isFinal}`));

    const ws = (dg as any).ws as MockWS;
    ws.onopen?.();
    ws.onmessage?.({ data: JSON.stringify({
      channel: { alternatives: [{ transcript: "hello", words: [{ speaker: 0 }] }] },
      is_final: true,
    }) });

    expect(events).toEqual(["0:hello:true"]);
  });

  it("converts Float32Array to Int16 PCM before sending", async () => {
    const { DeepgramClient } = await import("../src/main/audio/deepgram");
    const dg = new DeepgramClient("ws://test", "tok");
    const ws = (dg as any).ws as MockWS;
    ws.onopen?.();
    dg.pushAudio(new Float32Array([0, 0.5, -0.5, 1]));
    expect(ws.sent.length).toBe(1);
    const buf = ws.sent[0] as ArrayBuffer;
    const view = new Int16Array(buf);
    expect(Array.from(view)).toEqual([0, 16383, -16384, 32767]);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

- [ ] **Step 3: Implement `deepgram.ts`**

```ts
// apps/desktop/src/main/audio/deepgram.ts
import { EventEmitter } from "node:events";

export class DeepgramClient extends EventEmitter {
  private ws: WebSocket;
  constructor(public readonly url: string, public readonly token: string) {
    super();
    this.ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
    this.ws.onopen = () => this.emit("open");
    this.ws.onmessage = (e: any) => this.handleFrame(e.data);
    this.ws.onclose = () => this.emit("close");
    this.ws.onerror = (err: any) => this.emit("error", err);
  }

  pushAudio(frames: Float32Array) {
    if (this.ws.readyState !== 1) return;  // not open
    const pcm = new Int16Array(frames.length);
    for (let i = 0; i < frames.length; i++) {
      const s = Math.max(-1, Math.min(1, frames[i]));
      pcm[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7FFF);
    }
    this.ws.send(pcm.buffer);
  }

  close() { this.ws.close(); }

  private handleFrame(raw: any) {
    let msg: any;
    try { msg = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return; }
    const alt = msg?.channel?.alternatives?.[0];
    if (!alt?.transcript) return;
    const speaker = alt.words?.[0]?.speaker ?? null;
    this.emit("transcript", alt.transcript, speaker, msg.is_final ?? false);
  }
}
```

- [ ] **Step 4: Run tests, verify pass** (2/2)

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/audio/deepgram.ts apps/desktop/tests/deepgram.test.ts
git commit -m "feat(desktop): Deepgram streaming client (TDD)"
```

---

## Task 4: Auto-detect classifier (heuristic)

**Files:**
- Create: `apps/desktop/src/main/classifier.ts`
- Create: `apps/desktop/tests/classifier.test.ts`

**Behavior:** Pure function that takes the latest transcript chunk + a 60s history; returns `{isQuestion: boolean, confidence: 0-1}`. Heuristic v1: ends with question mark, contains an interrogative word ("how", "why", "tell me about", "describe", "what would you", etc.), comes from speaker 0 (interviewer) per Deepgram's diarization.

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/tests/classifier.test.ts
import { describe, it, expect } from "vitest";
import { classifyAsQuestion } from "../src/main/classifier";

describe("classifyAsQuestion", () => {
  it("triggers on a clear behavioral question", () => {
    const r = classifyAsQuestion({
      latest: "Tell me about a time you handled a difficult stakeholder.",
      speaker: 0,
    });
    expect(r.isQuestion).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it("triggers on a coding question", () => {
    const r = classifyAsQuestion({
      latest: "How would you write a SQL query to find the top 3 customers by revenue?",
      speaker: 0,
    });
    expect(r.isQuestion).toBe(true);
  });

  it("does NOT trigger on candidate's own speech (speaker 1)", () => {
    const r = classifyAsQuestion({
      latest: "How would I approach that?",
      speaker: 1,
    });
    expect(r.isQuestion).toBe(false);
  });

  it("does NOT trigger on declarative sentences", () => {
    const r = classifyAsQuestion({
      latest: "Today we are going to discuss your background.",
      speaker: 0,
    });
    expect(r.isQuestion).toBe(false);
  });

  it("triggers on Turkish behavioral question", () => {
    const r = classifyAsQuestion({
      latest: "Zor bir paydaşla çalıştığınız bir anı anlatır mısınız?",
      speaker: 0,
    });
    expect(r.isQuestion).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

- [ ] **Step 3: Implement `classifier.ts`**

```ts
// apps/desktop/src/main/classifier.ts
const INTERROGATIVES_EN = /\b(how|why|what|when|where|which|tell me about|describe|explain|walk me through|would you|could you|can you|design|implement)\b/i;
const INTERROGATIVES_TR = /\b(nasıl|neden|niye|hangi|hangisi|anlat|açıkla|tasarla|tarif et|söyle|söyler misin|anlatır mısın|göster|misin|musun)\b/i;
const ENDS_WITH_QMARK = /\?\s*$/;

export interface ClassifyInput {
  latest: string;
  speaker: number | null;  // 0 = interviewer (typically), 1 = candidate
}

export interface ClassifyResult {
  isQuestion: boolean;
  confidence: number;  // 0..1
}

export function classifyAsQuestion(input: ClassifyInput): ClassifyResult {
  // Don't trigger on candidate's own speech
  if (input.speaker === 1) return { isQuestion: false, confidence: 0 };

  let score = 0;
  if (ENDS_WITH_QMARK.test(input.latest)) score += 0.5;
  if (INTERROGATIVES_EN.test(input.latest)) score += 0.4;
  if (INTERROGATIVES_TR.test(input.latest)) score += 0.4;
  if (input.latest.length > 20) score += 0.1;  // very short utterances rarely full questions

  return { isQuestion: score >= 0.5, confidence: Math.min(1, score) };
}
```

- [ ] **Step 4: Run, verify all 5 tests pass**

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/classifier.ts apps/desktop/tests/classifier.test.ts
git commit -m "feat(desktop): heuristic question classifier EN+TR (TDD)"
```

---

## Task 5: macOS system audio capture (CATap helper)

**Files:**
- Create: `apps/desktop/src/main/capture/system-audio-mac.ts`
- Create: `apps/desktop/src/main/capture/system-audio.ts` (platform dispatcher)
- Create: `apps/desktop/resources/mac/ih-audio-tap.swift` (source of the precompiled helper)
- Build artifact: `apps/desktop/resources/mac/ih-audio-tap` (binary, committed to repo)

**Behavior:** A tiny Swift CLI tool uses `CATapDescription` (macOS 14.4+) to capture all-system audio output and writes 16kHz mono PCM to stdout. Electron main process spawns it as a child process and pipes stdout into the same ring buffer + Deepgram pipeline. On macOS < 14.4, the dispatcher detects and prompts the user to install BlackHole (out of scope — surface a UX message and skip system audio).

- [ ] **Step 1: Write the Swift helper**

`apps/desktop/resources/mac/ih-audio-tap.swift`:

```swift
import Foundation
import AudioToolbox
import CoreAudio

@available(macOS 14.4, *)
func startTap() throws {
  // Build a CATapDescription that mixes all system output
  var tapDesc = CATapDescription()
  tapDesc.processes = []  // empty = all processes
  tapDesc.muteBehavior = .unmuted
  tapDesc.isMixdown = true
  tapDesc.isPrivate = true

  var tapID = AudioObjectID()
  let status = AudioHardwareCreateProcessTap(&tapDesc, &tapID)
  guard status == noErr else { throw NSError(domain: "ih.tap", code: Int(status)) }

  // Read into a stream and write 16kHz mono Int16 PCM to stdout
  // (Implementation detail: use AVAudioEngine to format-convert, write FileHandle.standardOutput.write)
  // ... see full implementation in repo
  RunLoop.current.run()
}

if #available(macOS 14.4, *) {
  try startTap()
} else {
  FileHandle.standardError.write("ERROR: macOS 14.4+ required for system audio capture\n".data(using: .utf8)!)
  exit(2)
}
```

> **Implementer note:** the Swift implementation is non-trivial (CoreAudio APIs are gnarly). Use Apple's [Capturing system audio with Core Audio taps](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps) sample as the starting point. If the implementation balloons beyond ~150 lines, stop and report DONE_WITH_CONCERNS — we may want a separate native-helper sub-plan.

- [ ] **Step 2: Compile the helper**

```bash
cd apps/desktop/resources/mac
swiftc -O ih-audio-tap.swift -o ih-audio-tap
chmod +x ih-audio-tap
```

Verify it runs: `./ih-audio-tap` should either start emitting binary stdout (good) or print the macOS-version error to stderr (also acceptable on older OS).

- [ ] **Step 3: Implement `system-audio-mac.ts`**

```ts
// apps/desktop/src/main/capture/system-audio-mac.ts
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import { app } from "electron";
import { micBuffer } from "./mic";  // shared 60s ring buffer

let proc: ChildProcess | null = null;

export function startMacSystemAudio() {
  const binPath = path.join(app.getAppPath(), "resources/mac/ih-audio-tap");
  proc = spawn(binPath);
  proc.stdout?.on("data", (chunk: Buffer) => {
    // chunk is Int16 PCM; convert to Float32 for the ring buffer
    const i16 = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 0x8000;
    micBuffer.push(f32);
  });
  proc.stderr?.on("data", (data) => console.error("ih-audio-tap stderr:", data.toString()));
  proc.on("exit", (code) => console.log("ih-audio-tap exited:", code));
}

export function stopMacSystemAudio() {
  proc?.kill();
  proc = null;
}
```

- [ ] **Step 4: Implement platform dispatcher**

```ts
// apps/desktop/src/main/capture/system-audio.ts
import { startMacSystemAudio, stopMacSystemAudio } from "./system-audio-mac";

export function startSystemAudio() {
  if (process.platform === "darwin") return startMacSystemAudio();
  if (process.platform === "win32") {
    console.warn("Windows system audio not implemented in 2B; mic-only mode.");
    return;
  }
  console.warn("Unsupported platform for system audio");
}

export function stopSystemAudio() {
  if (process.platform === "darwin") stopMacSystemAudio();
}
```

- [ ] **Step 5: Wire into `main/index.ts`**

```ts
import { startSystemAudio, stopSystemAudio } from "./capture/system-audio";

app.whenReady().then(() => {
  registerMicIpc();
  startSystemAudio();  // attempt; logs warning on unsupported OS
  createOverlayWindow();
});

app.on("before-quit", () => stopSystemAudio());
```

- [ ] **Step 6: Manual smoke**

Run `npm run dev --workspace=@interview-helper/desktop` and play a short audio clip in another app (Spotify, YouTube). Watch the dev console — should see `ih-audio-tap stderr` only on errors, no spam if working. The ring buffer is filling silently; verification at the transcription level happens in Task 8.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/main/capture apps/desktop/resources/mac apps/desktop/src/main/index.ts
git commit -m "feat(desktop): macOS system audio via CATapDescription"
```

---

## Task 6: OpenAI + Gemini providers + router

**Files:**
- Create: `supabase/functions/_shared/openai.ts`
- Create: `supabase/functions/_shared/gemini.ts`
- Create: `supabase/functions/_shared/router.ts`
- Modify: `supabase/functions/llm-answer/index.ts`

**Behavior:** `llm-answer` accepts an additional optional `transcript` field (interviewer audio). Router classifies question type from screen+transcript, picks one of `claude | openai | gemini`, dispatches.

- [ ] **Step 1: `_shared/openai.ts`**

```ts
import OpenAI from "https://esm.sh/openai@4.65.0";

export function openaiClient() {
  return new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY")! });
}

export async function openaiAnswer(args: { systemPrompt: string; screenB64?: string; transcript?: string }) {
  const client = openaiClient();
  const content: any[] = [];
  if (args.transcript) content.push({ type: "text", text: args.transcript });
  if (args.screenB64) content.push({ type: "image_url", image_url: { url: `data:image/png;base64,${args.screenB64}` } });
  const r = await client.chat.completions.create({
    model: "gpt-5",  // fall back to "gpt-4o" if gpt-5 not available in your account
    max_completion_tokens: 2048,
    messages: [
      { role: "system", content: args.systemPrompt },
      { role: "user", content },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}
```

- [ ] **Step 2: `_shared/gemini.ts`**

```ts
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

export async function geminiAnswer(args: { systemPrompt: string; screenB64?: string; transcript?: string }) {
  const ai = new GoogleGenerativeAI(Deno.env.get("GEMINI_API_KEY")!);
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: args.systemPrompt });
  const parts: any[] = [];
  if (args.transcript) parts.push({ text: args.transcript });
  if (args.screenB64) parts.push({ inlineData: { mimeType: "image/png", data: args.screenB64 } });
  const r = await model.generateContent({ contents: [{ role: "user", parts }] });
  return r.response.text();
}
```

- [ ] **Step 3: `_shared/router.ts`**

```ts
import { SYSTEM_PROMPT_UNIVERSAL } from "./claude.ts";

export type ProviderId = "claude" | "openai" | "gemini";

export interface RouteInput {
  screenB64?: string;
  transcript?: string;
  hint?: string;  // optional client hint
}

export function pickProvider(input: RouteInput): ProviderId {
  const text = (input.transcript ?? "") + " " + (input.hint ?? "");
  // Behavioral / case → GPT-5 (better natural prose)
  if (/tell me about a time|describe a situation|how would you handle|stakeholder|team|conflict|anlatır mısın|paydaş/i.test(text)) {
    return "openai";
  }
  // Vision-heavy chart/dashboard → Gemini (fast vision)
  if (/chart|dashboard|graph|trend|metric|grafik|pano/i.test(text)) {
    return "gemini";
  }
  // Default: Claude (strong on coding + math + general reasoning)
  return "claude";
}

export const SYSTEM_PROMPT = SYSTEM_PROMPT_UNIVERSAL;
```

- [ ] **Step 4: Modify `llm-answer/index.ts`**

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { claudeClient, SYSTEM_PROMPT_UNIVERSAL } from "../_shared/claude.ts";
import { openaiAnswer } from "../_shared/openai.ts";
import { geminiAnswer } from "../_shared/gemini.ts";
import { pickProvider } from "../_shared/router.ts";

interface Req { screen_image_b64?: string; transcript?: string; type?: string; force_provider?: string }

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return jerr(401, "missing-token");
  const jwt = auth.slice(7);

  let body: Req;
  try { body = await req.json(); } catch { return jerr(400, "bad-json"); }
  if (!body.screen_image_b64 && !body.transcript) return jerr(400, "need screen or transcript");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return jerr(401, "invalid-token");

  // Mock mode
  if (Deno.env.get("ANTHROPIC_API_KEY") === "mock") {
    return Response.json({ answer: "SELECT 1; -- mocked", provider: "claude", latency_ms: 0 });
  }

  const provider = (body.force_provider as any) ?? pickProvider({
    screenB64: body.screen_image_b64, transcript: body.transcript, hint: body.type,
  });

  const t0 = Date.now();
  let answer = "";

  if (provider === "openai") {
    answer = await openaiAnswer({ systemPrompt: SYSTEM_PROMPT_UNIVERSAL, screenB64: body.screen_image_b64, transcript: body.transcript });
  } else if (provider === "gemini") {
    answer = await geminiAnswer({ systemPrompt: SYSTEM_PROMPT_UNIVERSAL, screenB64: body.screen_image_b64, transcript: body.transcript });
  } else {
    const claude = claudeClient();
    const content: any[] = [];
    if (body.transcript) content.push({ type: "text", text: body.transcript });
    if (body.screen_image_b64) content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: body.screen_image_b64 } });
    const msg = await claude.messages.create({
      model: "claude-sonnet-4-5", max_tokens: 2048,
      system: SYSTEM_PROMPT_UNIVERSAL,
      messages: [{ role: "user", content }],
    });
    answer = msg.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  }

  return Response.json({ answer, provider, latency_ms: Date.now() - t0 });
});

function jerr(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}
```

- [ ] **Step 5: Type-check + commit**

```bash
deno check supabase/functions/_shared/openai.ts supabase/functions/_shared/gemini.ts supabase/functions/_shared/router.ts supabase/functions/llm-answer/index.ts
git add supabase/functions
git commit -m "feat(api): multi-provider routing (Claude + GPT-5 + Gemini)"
```

---

## Task 7: Re-roll hotkey + UI integration

**Files:**
- Modify: `apps/desktop/src/main/hotkeys.ts` — add `onReroll`
- Modify: `apps/desktop/src/main/questionloop.ts` — add `rerollAnswer(win, token, lastInput)`
- Modify: `apps/desktop/src/main/index.ts` — wire reroll
- Modify: `apps/desktop/src/main/api.ts` — accept `forceProvider`
- Modify: `apps/desktop/src/renderer/state.ts` — add `lastInput` to state

**Behavior:** ⌘⇧A re-runs the last question with `force_provider` cycling through `[openai, gemini, claude]` to get a different opinion.

- [ ] **Step 1: Modify `hotkeys.ts`** — add a 3rd handler param `onReroll` with shortcut `CommandOrControl+Shift+A`. Update its test.

- [ ] **Step 2: Modify `questionloop.ts`**

```ts
const PROVIDER_CYCLE = ["openai", "gemini", "claude"] as const;
let lastInput: { screenB64: string; transcript?: string } | null = null;
let lastProvider: string | null = null;

export async function triggerAnswer(win: BrowserWindow, token: string) {
  win.webContents.send("ih:trigger");
  try {
    const screenB64 = await captureScreenAsPngBase64();
    lastInput = { screenB64 };
    const result = await askLlm({ token, screenB64 });
    lastProvider = result.provider;
    win.webContents.send("ih:answer", result);
  } catch (e: any) {
    win.webContents.send("ih:error", e.message ?? String(e));
  }
}

export async function rerollAnswer(win: BrowserWindow, token: string) {
  if (!lastInput) return;
  const next = nextProvider(lastProvider);
  win.webContents.send("ih:trigger");
  try {
    const result = await askLlm({ token, screenB64: lastInput.screenB64, forceProvider: next });
    lastProvider = result.provider;
    win.webContents.send("ih:answer", result);
  } catch (e: any) {
    win.webContents.send("ih:error", e.message ?? String(e));
  }
}

function nextProvider(current: string | null): string {
  const i = PROVIDER_CYCLE.indexOf(current as any);
  return PROVIDER_CYCLE[(i + 1) % PROVIDER_CYCLE.length];
}
```

- [ ] **Step 3: Modify `api.ts`**

```ts
export async function askLlm(args: { token: string; screenB64?: string; transcript?: string; type?: string; forceProvider?: string }) {
  const r = await fetch(`${API_BASE}/llm-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${args.token}` },
    body: JSON.stringify({
      screen_image_b64: args.screenB64,
      transcript: args.transcript,
      type: args.type ?? "auto",
      force_provider: args.forceProvider,
    }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `http-${r.status}`);
  return body;
}
```

- [ ] **Step 4: Wire in `main/index.ts`**

```ts
registerHotkeys({
  onTrigger: () => triggerAnswer(win, DEV_TOKEN),
  onReroll: () => rerollAnswer(win, DEV_TOKEN),
  onDismiss: () => win.webContents.send("ih:dismiss"),
});
```

- [ ] **Step 5: Run tests** — hotkey test now expects 3 handlers; update accordingly. All previous tests must still pass.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop
git commit -m "feat(desktop): re-roll hotkey + provider cycling"
```

---

## Task 8: End-to-end smoke test (manual, operator-driven)

**No automated test.** This is the verification step where the operator runs the full system and confirms behavioral + screen + audio flows work.

- [ ] **Step 1: Drop all keys into env**

```bash
cat > /Users/cgozdemm/interview-helper/supabase/functions/.env <<EOF
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
DEEPGRAM_API_KEY=...
EOF
```

- [ ] **Step 2: Boot stack**

```bash
docker rm -f $(docker ps -aq --filter "name=supabase") 2>/dev/null
cd /Users/cgozdemm/interview-helper && supabase start && supabase db reset
supabase functions serve --no-verify-jwt &
TOKEN=$(curl -s -X POST http://localhost:54321/functions/v1/auth-signup -H 'Content-Type: application/json' -d '{"email":"dev@local","password":"p4ssword!","device_fp":"dev-1"}' | jq -r .access_token)
IH_DEV_TOKEN=$TOKEN npm run dev --workspace=@interview-helper/desktop
```

- [ ] **Step 3: Test matrix (5 scenarios, in order)**

| # | Scenario | Action | Expected |
|---|---|---|---|
| 1 | Screen-only SQL | DataLemur SQL problem on screen, ⌘⇧\\ | Answer card with SQL, badge `CLAUDE · X.Xs · CODE` |
| 2 | Audio behavioral | Speak: "Tell me about a time you handled a difficult stakeholder" | Auto-trigger within 2s, STAR bullets, badge `OPENAI · X.Xs · PROSE` |
| 3 | Mixed (audio + screen) | Screen has chart, ask out loud "What does this chart suggest about user retention?" | Triggered, answer reads chart, badge `GEMINI · X.Xs · PROSE` |
| 4 | Re-roll | After scenario 1, hit ⌘⇧A | Same SQL question routed through GPT-5; different answer |
| 5 | Stealth still holds | Cmd+Shift+3 during scenario 3 | Overlay invisible in screenshot |

- [ ] **Step 4: Report results inline in this plan as comments under each row**

Mark each scenario ✓ or ✗ with a one-line note. ✗ → file a follow-up task.

---

## Phase 2B wrap-up checklist

- [ ] All 8 commits on `main`
- [ ] All unit tests pass (target: ~25 across all phases)
- [ ] Smoke test 5/5 scenarios pass
- [ ] Audio + transcription latency < 1.5s end-to-end (Deepgram contributes ~300ms)
- [ ] Reviewer-confirmed clean Phase 2B

---

## Notes for the executing engineer

1. **Audio quality matters.** Mic input should be 16kHz mono — if `getUserMedia` returns 48kHz or stereo, downsample/mixdown in the renderer before pushing frames. Deepgram nova-3 with `interim_results` is what gives us the sub-second feel.

2. **CATapDescription is the riskiest task.** The Swift API is sparse and Apple's docs are limited. If the helper takes more than ~150 lines of Swift, stop and report — we may need a separate native-helper sub-plan with a maintainer who's done CoreAudio work.

3. **Provider routing is heuristic, not ML.** The router in `_shared/router.ts` matches keywords. Phase 4 will replace this with a small classifier model if false-routing rate exceeds 15%.

4. **Mock mode** still works for `ANTHROPIC_API_KEY=mock`. Other providers don't have mock branches in 2B — tests use Claude mock. OpenAI/Gemini paths are exercised only in the Task 8 smoke.

5. **What's deliberately omitted from 2B:** Token streaming to overlay (whole-answer-at-once is fine for v1), persistent conversation memory, rate limits per user, cost-per-call attribution. All of these are Phase 4.
