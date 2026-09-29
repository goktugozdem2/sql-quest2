// The tutor's request to the Claude API (2026-09-30: Haiku 4.5 -> Sonnet 5.5,
// founder's decision). Guards the parts a quiet edit could break: the model,
// the thinking/effort pair Sonnet 5.5 accepts, the cache marker, the fallback
// header + field pair, and reading the reply by block type.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../supabase/functions/ai-tutor/index.ts', import.meta.url), 'utf8');
const call = src.slice(src.indexOf('async function callClaude('));

describe('ai-tutor calls Claude Sonnet 5.5 the way it accepts', () => {
  it('names claude-sonnet-5-5 and no other model', () => {
    expect(src).toMatch(/const TUTOR_MODEL = "claude-sonnet-5-5";/);
    expect(call).toMatch(/model: TUTOR_MODEL,/);
    expect(src).not.toMatch(/claude-haiku/);
  });

  it('turns extended thinking off the only way Sonnet 5.5 allows, at an effort it allows', () => {
    expect(call).toMatch(/thinking: \{ type: "between_tools" \}/);
    expect(call).toMatch(/output_config: \{ effort: "(low|medium|high)" \}/);
    expect(call).not.toMatch(/type: "disabled"|budget_tokens|temperature|top_p|top_k/);
  });

  it('caches the prefix with the top-level marker', () => {
    expect(call).toMatch(/cache_control: \{ type: "ephemeral" \}/);
  });

  it('sends the default fallback with its own beta header, never the array form', () => {
    expect(call).toMatch(/"anthropic-beta": "server-side-fallback-2026-07-01"/);
    expect(call).toMatch(/fallbacks: "default"/);
    expect(call).not.toMatch(/fallbacks: \[/);
  });

  it('reads the reply by block type and answers a refusal', () => {
    expect(src).not.toMatch(/content\?\.\[0\]\?\.text/);
    expect(src.match(/const text = textOf\(aiResponse\);/g)).toHaveLength(2);
    expect(src).toMatch(/b\?\.type === "text"/);
    expect(src).toMatch(/stop_reason === "refusal"\) return REFUSAL_TEXT/);
  });
});
