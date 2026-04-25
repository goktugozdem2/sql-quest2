import { describe, it, expect } from 'vitest';
import { detectTurkish, TURKISH_SYSTEM_PROMPT_PREFIX } from '../src/utils/language.js';

describe('detectTurkish', () => {
  it('returns false for null/undefined/empty', () => {
    expect(detectTurkish(null)).toBe(false);
    expect(detectTurkish(undefined)).toBe(false);
    expect(detectTurkish('')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(detectTurkish(123)).toBe(false);
    expect(detectTurkish({})).toBe(false);
    expect(detectTurkish([])).toBe(false);
  });

  it('detects Turkish-specific characters (ı, ğ, ş, ç, ö, ü)', () => {
    expect(detectTurkish('ığşçöü')).toBe(true);
    expect(detectTurkish('İĞŞÇÖÜ')).toBe(true);
    expect(detectTurkish('Merhaba dünya')).toBe(true);
    expect(detectTurkish('Sorgu çalışmıyor')).toBe(true);
    expect(detectTurkish('SQL öğrenmek istiyorum')).toBe(true);
  });

  it('detects common Turkish words without diacritics', () => {
    expect(detectTurkish('nasil yaparim')).toBe(true);
    expect(detectTurkish('hata aldim')).toBe(true);
    expect(detectTurkish('merhaba')).toBe(true);
    expect(detectTurkish('anlamadim bunu')).toBe(true);
    expect(detectTurkish('tesekkurler')).toBe(true);
  });

  it('returns false for pure English', () => {
    expect(detectTurkish('Hello world')).toBe(false);
    expect(detectTurkish('How do I write a SELECT query?')).toBe(false);
    expect(detectTurkish('SELECT * FROM users')).toBe(false);
    expect(detectTurkish('thanks!')).toBe(false);
    expect(detectTurkish('what is window function')).toBe(false);
  });

  it('returns false for pure SQL code without text', () => {
    expect(detectTurkish('SELECT name FROM users')).toBe(false);
    expect(detectTurkish('GROUP BY department HAVING COUNT(*) > 1')).toBe(false);
    expect(detectTurkish('LEFT JOIN orders ON users.id = orders.user_id')).toBe(false);
  });

  it('detects mixed Turkish/English messages', () => {
    expect(detectTurkish('Hello, nasılsın?')).toBe(true);
    expect(detectTurkish('SQL hata var')).toBe(true);
    expect(detectTurkish('I have hata in my query')).toBe(true);
  });

  it('detects common Turkish question patterns', () => {
    expect(detectTurkish('Bu ne demek?')).toBe(true);
    expect(detectTurkish('Niye çalışmıyor?')).toBe(true);
    expect(detectTurkish('Nasıl yapılır?')).toBe(true);
    expect(detectTurkish('Yardım edebilir misin?')).toBe(true);
  });

  it('handles uppercase Turkish input', () => {
    expect(detectTurkish('NASIL YAPARIM')).toBe(true);
    expect(detectTurkish('SELAM')).toBe(true);
    expect(detectTurkish('TEŞEKKÜRLER')).toBe(true);
  });

  it('does not false-positive on English SQL questions', () => {
    expect(detectTurkish('How do I use GROUP BY?')).toBe(false);
    expect(detectTurkish('What does HAVING mean?')).toBe(false);
    expect(detectTurkish('Help me with this query')).toBe(false);
    expect(detectTurkish('I am stuck on the JOIN')).toBe(false);
  });

  it('detects Turkish in long realistic messages', () => {
    expect(detectTurkish(
      'Merhaba, GROUP BY ile bir sorgu yazmaya çalışıyorum ama hata alıyorum'
    )).toBe(true);
    expect(detectTurkish(
      'Bu CASE WHEN ifadesini nasıl yazacağımı anlamadım'
    )).toBe(true);
  });
});

describe('TURKISH_SYSTEM_PROMPT_PREFIX', () => {
  it('exports a non-empty string', () => {
    expect(typeof TURKISH_SYSTEM_PROMPT_PREFIX).toBe('string');
    expect(TURKISH_SYSTEM_PROMPT_PREFIX.length).toBeGreaterThan(200);
  });

  it('explicitly mentions Turkish language', () => {
    expect(TURKISH_SYSTEM_PROMPT_PREFIX.toLowerCase()).toContain('turkish');
  });

  it('instructs to keep SQL keywords in English', () => {
    expect(TURKISH_SYSTEM_PROMPT_PREFIX).toContain('SQL keywords');
    expect(TURKISH_SYSTEM_PROMPT_PREFIX).toMatch(/SELECT|JOIN|FROM/);
  });

  it("uses informal 'sen' form instruction", () => {
    expect(TURKISH_SYSTEM_PROMPT_PREFIX).toContain("'sen'");
  });

  it('mentions the audience (bootcamp grads, students, career changers)', () => {
    expect(TURKISH_SYSTEM_PROMPT_PREFIX.toLowerCase()).toMatch(
      /bootcamp|student|career changer/
    );
  });
});
