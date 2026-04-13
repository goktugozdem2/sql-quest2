import { describe, it, expect } from 'vitest';
import { analyzeStudentSignals, getAdaptiveDifficulty, IDK_REGEX, SQL_KEYWORD_REGEX } from '../src/utils/socratic-tutor.js';

describe('IDK_REGEX', () => {
  const positives = [
    "I don't know",
    "idk",
    "no idea",
    "I can't do this",
    "i cant",
    "not sure",
    "no clue",
    "help me",
    "I'm lost",
    "im lost",
    "i give up",
    "show me the answer",
    "I don't know how to write SQL",
  ];

  const negatives = [
    "SELECT * FROM passengers",
    "maybe use WHERE",
    "I think GROUP BY",
    "let me try",
    "the answer is 42",
    "yes",
    "ok",
    "",
  ];

  positives.forEach(input => {
    it(`matches: "${input}"`, () => {
      expect(IDK_REGEX.test(input)).toBe(true);
    });
  });

  negatives.forEach(input => {
    it(`does not match: "${input}"`, () => {
      expect(IDK_REGEX.test(input)).toBe(false);
    });
  });
});

describe('SQL_KEYWORD_REGEX', () => {
  it('detects SELECT', () => {
    expect(SQL_KEYWORD_REGEX.test('SELECT name FROM users')).toBe(true);
  });

  it('detects WHERE', () => {
    expect(SQL_KEYWORD_REGEX.test('I would use WHERE survived = 1')).toBe(true);
  });

  it('detects GROUP BY', () => {
    expect(SQL_KEYWORD_REGEX.test('maybe GROUP BY department')).toBe(true);
  });

  it('does not match plain English', () => {
    expect(SQL_KEYWORD_REGEX.test('I would filter the list')).toBe(false);
  });

  it('case insensitive', () => {
    expect(SQL_KEYWORD_REGEX.test('select * from table')).toBe(true);
  });
});

describe('analyzeStudentSignals', () => {
  it('detects short response', () => {
    const signals = analyzeStudentSignals('ok');
    expect(signals.isShort).toBe(true);
    expect(signals.engagement).toBe('low');
  });

  it('detects SQL in response', () => {
    const signals = analyzeStudentSignals('SELECT * FROM passengers WHERE survived = 1');
    expect(signals.containsSQL).toBe(true);
    expect(signals.sqlFluency).toBe('attempting_sql');
  });

  it('detects plain English response', () => {
    const signals = analyzeStudentSignals('I would filter the list to only show survivors');
    expect(signals.containsSQL).toBe(false);
    expect(signals.sqlFluency).toBe('plain_english');
    expect(signals.engagement).toBe('medium');
  });

  it('detects questions', () => {
    const signals = analyzeStudentSignals('What does WHERE do?');
    expect(signals.askedQuestion).toBe(true);
  });

  it('detects idk', () => {
    const signals = analyzeStudentSignals("I don't know");
    expect(signals.isIdk).toBe(true);
  });

  it('detects copy-paste from expected query', () => {
    const signals = analyzeStudentSignals(
      'SELECT * FROM passengers WHERE survived = 1',
      { expectedQuery: 'SELECT * FROM passengers WHERE survived = 1' }
    );
    expect(signals.isCopyPaste).toBe(true);
  });

  it('does not false-positive on similar but different query', () => {
    const signals = analyzeStudentSignals(
      'SELECT name FROM passengers WHERE survived = 1',
      { expectedQuery: 'SELECT * FROM passengers WHERE survived = 1' }
    );
    expect(signals.isCopyPaste).toBe(false);
  });

  it('high engagement for long response', () => {
    const signals = analyzeStudentSignals(
      'I think I need to use some kind of filtering mechanism to narrow down the results to only show specific rows'
    );
    expect(signals.engagement).toBe('high');
  });
});

describe('getAdaptiveDifficulty', () => {
  it('nailed_attempt starts at medium', () => {
    expect(getAdaptiveDifficulty('nailed_attempt', 0)).toBe('medium');
    expect(getAdaptiveDifficulty('nailed_attempt', 1)).toBe('medium');
  });

  it('nailed_attempt ramps to hard', () => {
    expect(getAdaptiveDifficulty('nailed_attempt', 2)).toBe('hard');
    expect(getAdaptiveDifficulty('nailed_attempt', 5)).toBe('hard');
  });

  it('needed_full_reveal starts at easy', () => {
    expect(getAdaptiveDifficulty('needed_full_reveal', 0)).toBe('easy');
    expect(getAdaptiveDifficulty('needed_full_reveal', 1)).toBe('easy');
  });

  it('needed_full_reveal ramps to easy-medium', () => {
    expect(getAdaptiveDifficulty('needed_full_reveal', 2)).toBe('easy-medium');
  });

  it('struggled_discover starts at easy', () => {
    expect(getAdaptiveDifficulty('struggled_discover', 0)).toBe('easy');
  });

  it('struggled_discover ramps to medium', () => {
    expect(getAdaptiveDifficulty('struggled_discover', 2)).toBe('medium');
  });

  it('defaults to struggled_discover behavior for unknown history', () => {
    expect(getAdaptiveDifficulty('unknown', 0)).toBe('easy');
    expect(getAdaptiveDifficulty('unknown', 3)).toBe('medium');
  });
});
