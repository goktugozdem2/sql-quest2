import { describe, it, expect } from 'vitest';
import { formatCell, formatTime, highlightSQL } from '../src/utils/formatters.js';

describe('formatCell', () => {
  it('returns NULL for null', () => {
    expect(formatCell(null)).toBe('NULL');
  });

  it('returns NULL for undefined', () => {
    expect(formatCell(undefined)).toBe('NULL');
  });

  it('formats integers as strings without decimals', () => {
    expect(formatCell(42)).toBe('42');
  });

  it('formats floats to 2 decimal places', () => {
    expect(formatCell(3.14159)).toBe('3.14');
  });

  it('formats numeric strings as numbers', () => {
    expect(formatCell('3.14159')).toBe('3.14');
  });

  it('returns non-numeric strings as-is', () => {
    expect(formatCell('hello')).toBe('hello');
  });

  it('returns empty string as-is (not treated as number)', () => {
    expect(formatCell('')).toBe('');
  });

  it('truncates with maxLength', () => {
    expect(formatCell(123456, 3)).toBe('123');
  });

  it('truncates float with maxLength', () => {
    expect(formatCell(3.14159, 4)).toBe('3.14');
  });

  it('truncates strings with maxLength', () => {
    expect(formatCell('hello world', 5)).toBe('hello');
  });

  it('handles zero correctly', () => {
    expect(formatCell(0)).toBe('0');
  });

  it('handles negative numbers', () => {
    expect(formatCell(-5.678)).toBe('-5.68');
  });

  it('handles negative integers', () => {
    expect(formatCell(-42)).toBe('-42');
  });

  it('handles string with only spaces', () => {
    expect(formatCell('   ')).toBe('   ');
  });
});

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats exactly one minute', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2:05');
  });

  it('pads single-digit seconds', () => {
    expect(formatTime(61)).toBe('1:01');
  });

  it('handles large values', () => {
    expect(formatTime(3661)).toBe('61:01');
  });
});

describe('highlightSQL', () => {
  it('returns empty string for falsy input', () => {
    expect(highlightSQL('')).toBe('');
    expect(highlightSQL(null)).toBe('');
    expect(highlightSQL(undefined)).toBe('');
  });

  it('escapes HTML when Prism is not available', () => {
    expect(highlightSQL('SELECT <name> FROM users')).toBe('SELECT &lt;name&gt; FROM users');
  });

  it('escapes angle brackets in SQL', () => {
    expect(highlightSQL('a > b AND c < d')).toBe('a &gt; b AND c &lt; d');
  });
});
