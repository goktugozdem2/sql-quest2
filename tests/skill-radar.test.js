/**
 * Unit tests for the SkillRadar primitive's pure helpers.
 *
 * We don't snapshot-test the SVG itself. SVG output is visual, churny, and
 * the smoke test catches render-breaking bugs end-to-end. What matters here
 * is the pure logic: key aliasing (normalizeSkills) and archetype derivation
 * (deriveArchetype). Those drive share copy, profile pages, and identity,
 * so they need real test coverage.
 */

import { describe, it, expect } from 'vitest';
import { normalizeSkills, deriveArchetype, DEFAULT_SKILLS, DEFAULT_META } from '../src/components/SkillRadar.jsx';

describe('normalizeSkills', () => {
  it('passes canonical keys through unchanged', () => {
    const out = normalizeSkills({
      'Window Functions': 75,
      'Joins': 60,
      'Aggregation & Grouping': 45,
    });
    expect(out['Window Functions']).toBe(75);
    expect(out['Joins']).toBe(60);
    expect(out['Aggregation & Grouping']).toBe(45);
  });

  it('maps legacy short keys to the 9-skill canonical form', () => {
    const out = normalizeSkills({
      'SELECT': 50,   // → Querying Basics
      'AGG': 40,      // → Aggregation & Grouping
      'JOIN': 70,     // → Joins
      'SUBQ': 30,     // → Subqueries & CTEs
      'STRING': 25,
      'DATE': 35,
      'CASE': 45,     // → Conditional Logic
      'WINDOW': 80,
    });
    expect(out['Querying Basics']).toBe(50);
    expect(out['Aggregation & Grouping']).toBe(40);
    expect(out['Joins']).toBe(70);
    expect(out['Subqueries & CTEs']).toBe(30);
    expect(out['String Functions']).toBe(25);
    expect(out['Date Functions']).toBe(35);
    expect(out['Conditional Logic']).toBe(45);
    expect(out['Window Functions']).toBe(80);
  });

  it('merges SELECT Basics + Filter & Sort into Querying Basics via MAX', () => {
    const out = normalizeSkills({
      'SELECT Basics': 60,
      'Filter & Sort': 75,  // higher — should win
    });
    expect(out['Querying Basics']).toBe(75);
    expect(out['SELECT Basics']).toBeUndefined();
    expect(out['Filter & Sort']).toBeUndefined();
  });

  it('merges Aggregation + GROUP BY into Aggregation & Grouping via MAX', () => {
    const out = normalizeSkills({
      'Aggregation': 40,
      'GROUP BY': 55,
    });
    expect(out['Aggregation & Grouping']).toBe(55);
  });

  it('maps plural/alt forms (Windows, Dates, Strings, Aggregates, JOINs)', () => {
    const out = normalizeSkills({
      'Windows': 90,
      'Dates': 50,
      'Strings': 40,
      'Aggregates': 60,
      'JOINs': 70,
    });
    expect(out['Window Functions']).toBe(90);
    expect(out['Date Functions']).toBe(50);
    expect(out['String Functions']).toBe(40);
    expect(out['Aggregation & Grouping']).toBe(60);
    expect(out['Joins']).toBe(70);
  });

  it('handles empty/null input safely', () => {
    expect(normalizeSkills({})).toEqual({});
    expect(normalizeSkills(null)).toEqual({});
    expect(normalizeSkills(undefined)).toEqual({});
  });
});

describe('deriveArchetype', () => {
  it('returns Explorer when no skills are tracked', () => {
    const a = deriveArchetype({});
    expect(a.name).toBe('The Explorer');
    expect(a.emoji).toBe('🧭');
  });

  it('returns Window Wizard for Windows ≥ 70', () => {
    const a = deriveArchetype({ 'Window Functions': 78, 'JOIN Tables': 30 });
    expect(a.name).toBe('The Window Wizard');
    expect(a.emoji).toBe('🪟');
  });

  it('returns Join Master for Joins ≥ 70 + Subqueries & CTEs ≥ 60', () => {
    const a = deriveArchetype({ 'Joins': 75, 'Subqueries & CTEs': 65, 'Window Functions': 40 });
    expect(a.name).toBe('The Join Master');
  });

  it('returns Aggregation Ace for Aggregation & Grouping ≥ 70', () => {
    const a = deriveArchetype({ 'Aggregation & Grouping': 72, 'Joins': 30 });
    expect(a.name).toBe('The Aggregation Ace');
  });

  it('returns Logic Surgeon for Conditional Logic ≥ 70 + Subqueries & CTEs ≥ 60', () => {
    const a = deriveArchetype({ 'Conditional Logic': 75, 'Subqueries & CTEs': 62, 'Joins': 30 });
    expect(a.name).toBe('The Logic Surgeon');
  });

  it('returns NULL Whisperer for NULL Handling ≥ 70', () => {
    const a = deriveArchetype({ 'NULL Handling': 78, 'Joins': 40 });
    expect(a.name).toBe('The NULL Whisperer');
  });

  it('returns Data Wrangler for Date Functions ≥ 70', () => {
    const a = deriveArchetype({ 'Date Functions': 72, 'Joins': 20 });
    expect(a.name).toBe('The Data Wrangler');
  });

  it('returns Full-Stack Analyst when avg ≥ 65', () => {
    const skills = {};
    DEFAULT_SKILLS.forEach(s => { skills[s] = 68; });
    const a = deriveArchetype(skills);
    expect(a.name).toBe('The Full-Stack Analyst');
  });

  it('returns Apprentice for low-but-present skills (avg 30-49)', () => {
    const skills = {};
    DEFAULT_SKILLS.forEach(s => { skills[s] = 35; });
    const a = deriveArchetype(skills);
    expect(a.name).toBe('The Apprentice');
  });

  it('normalizes legacy keys before derivation', () => {
    // Using the short-form key should still trigger Window Wizard.
    const a = deriveArchetype({ 'Windows': 80 });
    expect(a.name).toBe('The Window Wizard');
  });

  it('Window Wizard specialty wins over generalist avg', () => {
    // avg is low (mostly 0) but Windows is 80, should be Window Wizard.
    const a = deriveArchetype({ 'Window Functions': 80 });
    expect(a.name).toBe('The Window Wizard');
  });
});

describe('DEFAULT_SKILLS and DEFAULT_META alignment', () => {
  it('every canonical skill has meta', () => {
    DEFAULT_SKILLS.forEach(skill => {
      expect(DEFAULT_META[skill]).toBeDefined();
      expect(DEFAULT_META[skill].short).toBeTruthy();
      expect(DEFAULT_META[skill].icon).toBeTruthy();
    });
  });

  it('has exactly 9 canonical skills (Apr 2026 reshuffle)', () => {
    expect(DEFAULT_SKILLS.length).toBe(9);
  });
});
