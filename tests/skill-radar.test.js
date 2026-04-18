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
      'JOIN Tables': 60,
      'GROUP BY': 45,
    });
    expect(out['Window Functions']).toBe(75);
    expect(out['JOIN Tables']).toBe(60);
    expect(out['GROUP BY']).toBe(45);
  });

  it('maps legacy short keys to canonical form', () => {
    const out = normalizeSkills({
      'SELECT': 50,
      'WHERE': 60,
      'AGG': 40,
      'JOIN': 70,
      'GROUP': 55,
      'SUBQ': 30,
      'STRING': 25,
      'DATE': 35,
      'CASE': 45,
      'WINDOW': 80,
    });
    expect(out['SELECT Basics']).toBe(50);
    expect(out['Filter & Sort']).toBe(60);
    expect(out['Aggregation']).toBe(40);
    expect(out['JOIN Tables']).toBe(70);
    expect(out['GROUP BY']).toBe(55);
    expect(out['Subqueries']).toBe(30);
    expect(out['String Functions']).toBe(25);
    expect(out['Date Functions']).toBe(35);
    expect(out['CASE Statements']).toBe(45);
    expect(out['Window Functions']).toBe(80);
  });

  it('maps plural/alt forms (Windows, Dates, Strings, Aggregates, JOINs)', () => {
    const out = normalizeSkills({
      'Windows': 90,
      'Dates': 50,
      'Strings': 40,
      'Aggregates': 60,
      'JOINs': 70,
      'WHERE/ORDER': 55,
    });
    expect(out['Window Functions']).toBe(90);
    expect(out['Date Functions']).toBe(50);
    expect(out['String Functions']).toBe(40);
    expect(out['Aggregation']).toBe(60);
    expect(out['JOIN Tables']).toBe(70);
    expect(out['Filter & Sort']).toBe(55);
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

  it('returns Join Master for Joins ≥ 70 + Subqueries ≥ 60', () => {
    const a = deriveArchetype({ 'JOIN Tables': 75, 'Subqueries': 65, 'Window Functions': 40 });
    expect(a.name).toBe('The Join Master');
  });

  it('returns Aggregation Ace for Aggregation ≥ 70 + GROUP BY ≥ 65', () => {
    const a = deriveArchetype({ 'Aggregation': 72, 'GROUP BY': 68, 'JOIN Tables': 30 });
    expect(a.name).toBe('The Aggregation Ace');
  });

  it('returns Logic Surgeon for CASE ≥ 70 + Subqueries ≥ 60', () => {
    const a = deriveArchetype({ 'CASE Statements': 75, 'Subqueries': 62, 'JOIN Tables': 30 });
    expect(a.name).toBe('The Logic Surgeon');
  });

  it('returns Data Wrangler for Date Functions ≥ 70', () => {
    const a = deriveArchetype({ 'Date Functions': 72, 'JOIN Tables': 20 });
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

  it('has exactly 10 canonical skills (current taxonomy)', () => {
    // Update this when the 9-skill reshuffle ships.
    expect(DEFAULT_SKILLS.length).toBe(10);
  });
});
