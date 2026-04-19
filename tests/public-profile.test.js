/**
 * Unit tests for the parsePublicProfileHandle URL helper. The component
 * itself is tested via smoke tests + manual browser checks — SVG rendering
 * and localStorage access need a real browser.
 */

import { describe, it, expect } from 'vitest';
import { parsePublicProfileHandle } from '../src/components/PublicProfile.jsx';

describe('parsePublicProfileHandle', () => {
  it('extracts handle from /u/:handle', () => {
    expect(parsePublicProfileHandle('/u/foo')).toBe('foo');
  });

  it('handles trailing slash', () => {
    expect(parsePublicProfileHandle('/u/bar/')).toBe('bar');
  });

  it('lowercases the handle', () => {
    expect(parsePublicProfileHandle('/u/MIXEDCase')).toBe('mixedcase');
  });

  it('trims whitespace (via decode)', () => {
    expect(parsePublicProfileHandle('/u/%20padded%20')).toBe('padded');
  });

  it('returns null for non-matching paths', () => {
    expect(parsePublicProfileHandle('/')).toBeNull();
    expect(parsePublicProfileHandle('/app.html')).toBeNull();
    expect(parsePublicProfileHandle('/u/')).toBeNull();
    expect(parsePublicProfileHandle('/u/foo/bar')).toBeNull();
    expect(parsePublicProfileHandle('/users/foo')).toBeNull();
  });

  it('ignores query strings and fragments (caller strips pathname)', () => {
    // Caller passes pathname only, so this is about strict matching.
    expect(parsePublicProfileHandle('/u/foo?ref=twitter')).toBeNull();
  });

  it('decodes URI-encoded handles', () => {
    expect(parsePublicProfileHandle('/u/caf%C3%A9')).toBe('café');
  });

  it('returns null gracefully on malformed URI', () => {
    // Invalid percent-encoding should not throw.
    expect(parsePublicProfileHandle('/u/%E0%A4%A')).toBeNull();
  });

  it('handles empty/undefined input', () => {
    expect(parsePublicProfileHandle('')).toBeNull();
    expect(parsePublicProfileHandle(undefined)).toBeNull();
  });
});
