// Tests for the /u/:handle share loop: server-rendered meta tags + the PNG card.
//
// These pin down the two defects that made the loop dead on arrival:
//   1. og/twitter tags were injected client-side, so scrapers (which never run
//      our JS) saw the generic site card — all 132 published profiles unfurled
//      identically.
//   2. og:image was image/svg+xml, which every major card renderer silently
//      rejects.
//
// fetch is stubbed so the suite stays hermetic — no Supabase round-trip.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ELENA = {
  handle: 'elena',
  display_name: 'elena',
  skills: {
    'Joins': 31, 'NULL Handling': 63, 'Date Functions': 23, 'Querying Basics': 52,
    'String Functions': 63, 'Window Functions': 51, 'Conditional Logic': 51,
    'Subqueries & CTEs': 48, 'Aggregation & Grouping': 52,
  },
  total_solves: 134, streak: 0, xp: 12654,
  archetype_name: 'The Apprentice', archetype_emoji: '📚',
};

function stubFetch(rows) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => rows })));
}

function mockRes() {
  return {
    headers: {}, code: 0, body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.code = c; return this; },
    send(b) { this.body = b; return this; },
    end() { return this; },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('/u/:handle server-rendered meta', () => {
  let handler, U;
  beforeEach(async () => {
    const mod = await import('../api/u.js');
    handler = mod.default;
    U = mod._internals;
  });

  it('injects the handle into og:title and points og:image at the PNG endpoint', async () => {
    stubFetch([ELENA]);
    const res = mockRes();
    await handler({ query: { handle: 'elena' } }, res);

    expect(res.code).toBe(200);
    expect(res.body).toMatch(/<meta property="og:title" content="[^"]*elena[^"]*">/);
    expect(res.body).toContain('/api/og-card?handle=elena');
    expect(res.body).toContain('og:image:type" content="image/png');
  });

  it('never emits an SVG og:image — every card renderer rejects SVG', async () => {
    stubFetch([ELENA]);
    const res = mockRes();
    await handler({ query: { handle: 'elena' } }, res);
    expect(res.body).not.toMatch(/og:image"[^>]*\.svg/);
    expect(res.body).not.toContain('og-profile');
  });

  it('leaves exactly one of each tag — duplicates make the winner scraper-dependent', async () => {
    stubFetch([ELENA]);
    const res = mockRes();
    await handler({ query: { handle: 'elena' } }, res);
    expect((res.body.match(/property="og:title"/g) || []).length).toBe(1);
    expect((res.body.match(/property="og:image"/g) || []).length).toBe(1);
    expect((res.body.match(/name="twitter:image"/g) || []).length).toBe(1);
    expect((res.body.match(/<title>/g) || []).length).toBe(1);
    expect((res.body.match(/rel="canonical"/g) || []).length).toBe(1);
    expect((res.body.match(/name="description"/g) || []).length).toBe(1);
  });

  it('drops the generic site card so two profiles never unfurl the same', async () => {
    stubFetch([ELENA]);
    const a = mockRes();
    await handler({ query: { handle: 'elena' } }, a);
    stubFetch([{ ...ELENA, handle: 'prasanth', display_name: 'prasanth', total_solves: 81 }]);
    const b = mockRes();
    await handler({ query: { handle: 'prasanth' } }, b);

    expect(a.body).not.toContain('og-image.png');
    const titleOf = (h) => h.match(/<meta property="og:title" content="([^"]*)"/)[1];
    expect(titleOf(a.body)).not.toBe(titleOf(b.body));
  });

  it('tolerates the trailing slash vercel.json adds', async () => {
    stubFetch([ELENA]);
    const res = mockRes();
    await handler({ query: { handle: 'elena/' } }, res);
    expect(res.body).toContain('/api/og-card?handle=elena');
  });

  it('serves the untouched shell for an unclaimed handle', async () => {
    stubFetch([]);
    const res = mockRes();
    await handler({ query: { handle: 'nosuchuser' } }, res);
    expect(res.code).toBe(200);
    expect(res.body).toContain('<title>');
    expect(res.body).not.toContain('/api/og-card');
  });

  it('serves the shell rather than a 500 when the profile lookup throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('supabase down'); }));
    const res = mockRes();
    await handler({ query: { handle: 'elena' } }, res);
    expect(res.code).toBe(200);
    expect(res.body).toContain('<title>');
  });

  it('escapes profile text — display_name is user-controlled', () => {
    const block = U.metaBlock(
      { display_name: '</title><script>alert(1)</script>', skills: {}, total_solves: 1, streak: 0 },
      'x'
    );
    expect(block).not.toContain('<script>');
    expect(block).toContain('&lt;/title&gt;');
  });

  it('rejects handles that cannot exist in the table', () => {
    expect(U.HANDLE_RE.test('elena_1-x')).toBe(true);
    expect(U.HANDLE_RE.test('<script>')).toBe(false);
    expect(U.HANDLE_RE.test('Elena')).toBe(false); // publish-profile lowercases
    expect(U.HANDLE_RE.test('a'.repeat(41))).toBe(false);
    expect(U.HANDLE_RE.test('')).toBe(false);
  });

  it('describes the profile with its real numbers, not boilerplate', () => {
    const d = U.buildDescription(ELENA);
    expect(d).toContain('134 SQL challenges solved');
    expect(d).toContain('NULL Handling');
    expect(d).not.toContain('0-day streak'); // a dead streak isn't a brag
  });
});

describe('PNG share card', () => {
  let renderCard, O;
  beforeEach(async () => {
    const mod = await import('../api/og-card.js');
    renderCard = mod.renderCard;
    O = mod._internals;
  });

  it('renders a real PNG, not an SVG', async () => {
    stubFetch([ELENA]);
    const buf = await renderCard('elena');
    // PNG magic number. This assertion is the whole point of the file.
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buf.length).toBeGreaterThan(5000);
  });

  it('renders an invitation card for an unclaimed handle instead of failing', async () => {
    stubFetch([]);
    const buf = await renderCard('somebodynew');
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });

  it('produces visibly different bytes per profile', async () => {
    stubFetch([ELENA]);
    const a = await renderCard('elena');
    stubFetch([{ ...ELENA, display_name: 'prasanth', total_solves: 81, xp: 4257, streak: 6 }]);
    const b = await renderCard('prasanth');
    expect(a.equals(b)).toBe(false);
  });

  it('keeps the radar text-free so rasterising needs no font for it', () => {
    const svg = Buffer.from(O.radarSvg(ELENA.skills, 380).split(',')[1], 'base64').toString();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toContain('<text');
    expect(svg).toContain('polygon');
  });

  it('carries all 9 canonical skills, in the canonical order', async () => {
    const { CANONICAL_SKILLS } = await import('../src/utils/skill-calc.js');
    expect(O.SKILLS).toEqual([...CANONICAL_SKILLS]);
  });

  it('clamps out-of-range skill values instead of drawing outside the chart', () => {
    const svg = Buffer.from(O.radarSvg({ Joins: 5000, 'NULL Handling': -20 }, 380).split(',')[1], 'base64').toString();
    const coords = [...svg.matchAll(/([\d.]+),([\d.]+)/g)].flatMap((m) => [+m[1], +m[2]]);
    expect(Math.max(...coords)).toBeLessThanOrEqual(380);
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(0);
  });
});
