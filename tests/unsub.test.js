// Tests for /api/unsub — the unsubscribe route the capture drip has been
// linking to since it launched, which did not exist and returned 404.
//
// State when this was found (2026-07-26): 78 leads, 77 had received drip mail,
// every send carried a dead unsubscribe link, and exactly 0 rows had
// unsubscribed = true. Zero opt-outs across 77 people is not a preference, it
// is a broken mechanism.
//
// The assertions that matter here are the ones about NOT lying: never render
// "you're unsubscribed" unless the upstream confirmed it, and never echo the
// token back into the page.
import { describe, it, expect, vi, afterEach } from 'vitest';

function mockRes() {
  return {
    headers: {}, code: 0, body: '',
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.code = c; return this; },
    send(b) { this.body = b; return this; },
  };
}

const okUpstream = () => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));

afterEach(() => vi.unstubAllGlobals());

describe('/api/unsub', () => {
  it('confirms only when the upstream confirmed', async () => {
    okUpstream();
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '0123456789abcdef' } }, res);
    expect(res.code).toBe(200);
    expect(res.body).toMatch(/unsubscribed/i);
  });

  it('does NOT claim success when the upstream fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '0123456789abcdef' } }, res);
    expect(res.code).toBe(502);
    expect(res.body).not.toMatch(/you're unsubscribed/i);
    expect(res.body).toMatch(/could ?n[o']t complete/i);
  });

  it('does NOT claim success when the upstream throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '0123456789abcdef' } }, res);
    expect(res.code).toBe(502);
    expect(res.body).not.toMatch(/you're unsubscribed/i);
  });

  it('handles the registered-user token too', async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', spy);
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { ut: 'usertoken12345' } }, res);
    expect(res.code).toBe(200);
    expect(spy.mock.calls[0][0]).toContain('ut=usertoken12345');
  });

  it('never reflects the token into the HTML', async () => {
    okUpstream();
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '"><script>alert(1)</script>' } }, res);
    expect(res.body).not.toContain('<script>alert');
    expect(res.code).toBe(400);
  });

  it('rejects a missing or malformed token without calling upstream', async () => {
    const spy = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal('fetch', spy);
    const { default: handler } = await import('../api/unsub.js');
    for (const q of [{}, { t: 'short' }, { t: 'a'.repeat(200) }]) {
      const res = mockRes();
      await handler({ query: q }, res);
      expect(res.code).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('always serves real HTML and never caches the outcome', async () => {
    okUpstream();
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '0123456789abcdef' } }, res);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('tells the user transactional mail still arrives', async () => {
    okUpstream();
    const { default: handler } = await import('../api/unsub.js');
    const res = mockRes();
    await handler({ query: { t: '0123456789abcdef' } }, res);
    expect(res.body).toMatch(/password reset|receipt/i);
  });
});
