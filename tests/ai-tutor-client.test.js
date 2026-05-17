import { describe, it, expect } from 'vitest';
import { normalizeAiMessages } from '../src/utils/ai-tutor-client.js';

describe('normalizeAiMessages', () => {
  it('returns an empty array for non-arrays and conversations without a user opener', () => {
    expect(normalizeAiMessages(null)).toEqual([]);
    expect(normalizeAiMessages([{ role: 'assistant', content: 'hello' }])).toEqual([]);
  });

  it('drops blank messages and leading assistant messages', () => {
    expect(normalizeAiMessages([
      { role: 'assistant', content: 'intro' },
      { role: 'user', content: 'What is SELECT?' },
      { role: 'assistant', content: 'It reads rows.' },
      { role: 'user', content: '  ' },
    ])).toEqual([
      { role: 'user', content: 'What is SELECT?' },
      { role: 'assistant', content: 'It reads rows.' },
    ]);
  });

  it('keeps only alternating roles required by the Anthropic message format', () => {
    expect(normalizeAiMessages([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'duplicate user turn' },
      { role: 'assistant', content: 'answer' },
      { role: 'assistant', content: 'duplicate assistant turn' },
      { role: 'user', content: 'follow-up' },
    ])).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'answer' },
      { role: 'user', content: 'follow-up' },
    ]);
  });
});
