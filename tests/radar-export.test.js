/**
 * Unit tests for radar-export pure helpers. The canvas/blob path needs
 * a real browser — we cover that via the smoke test, not here.
 */

import { describe, it, expect } from 'vitest';
import { buildRadarShareSvg, buildShareUrl } from '../src/utils/radar-export.js';

describe('buildRadarShareSvg', () => {
  it('returns valid SVG with correct dimensions', () => {
    const svg = buildRadarShareSvg({ 'Window Functions': 80 });
    expect(svg).toMatch(/^<\?xml/);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it('includes the archetype name when the user has skills', () => {
    const svg = buildRadarShareSvg({ 'Window Functions': 80 });
    expect(svg).toContain('Window Wizard');
  });

  it('includes the overall score', () => {
    const svg = buildRadarShareSvg({
      'Window Functions': 80,
      'Joins': 60,
      'Querying Basics': 70,
    });
    // 3 skills, avg = 70
    expect(svg).toMatch(/[>]70</);
  });

  it('escapes XML-special chars in handle', () => {
    const svg = buildRadarShareSvg({ 'Joins': 50 }, { handle: '<script>evil</script>' });
    expect(svg).not.toContain('<script>evil');
    expect(svg).toContain('&lt;script&gt;evil&lt;/script&gt;');
  });

  it('defaults to Explorer archetype on empty skills', () => {
    const svg = buildRadarShareSvg({});
    expect(svg).toContain('Explorer');
  });

  it('respects custom width/height', () => {
    const svg = buildRadarShareSvg({ 'Joins': 50 }, { width: 800, height: 420 });
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="420"');
  });
});

describe('buildShareUrl', () => {
  it('builds a Twitter intent URL with encoded text + url', () => {
    const url = buildShareUrl('twitter', {
      skills: { 'Window Functions': 80 },
      brandUrl: 'sqlquest.io',
    });
    expect(url).toMatch(/^https:\/\/twitter\.com\/intent\/tweet/);
    expect(url).toContain('Window%20Wizard');
    expect(url).toContain(encodeURIComponent('https://sqlquest.io'));
  });

  it('builds a LinkedIn share URL with the brand URL', () => {
    const url = buildShareUrl('linkedin', { skills: { 'Joins': 50 } });
    expect(url).toContain('linkedin.com/sharing/share-offsite');
    expect(url).toContain(encodeURIComponent('https://sqlquest.io'));
  });

  it('builds a Facebook sharer URL', () => {
    const url = buildShareUrl('facebook', { skills: { 'Joins': 50 } });
    expect(url).toContain('facebook.com/sharer');
  });

  it('falls back to brand URL for unknown platform', () => {
    const url = buildShareUrl('unknown-platform', { skills: {}, brandUrl: 'example.com' });
    expect(url).toBe('https://example.com');
  });

  it('uses custom brand URL', () => {
    const url = buildShareUrl('twitter', {
      skills: { 'Joins': 50 },
      brandUrl: 'custom.app',
    });
    expect(url).toContain(encodeURIComponent('https://custom.app'));
  });
});
