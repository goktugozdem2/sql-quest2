// Lightweight client-side language detection for SQL Quest.
//
// Used to route AI Coach responses to Turkish mode when the user
// writes in Turkish. Pure function, testable in isolation, no DOM.
//
// Strategy: dual-signal detection.
//   1. Turkish-specific characters (ı, ğ, ş, ç, ö, ü) — high confidence.
//   2. Common Turkish function words ("nasıl", "neden", "hata", etc.) —
//      catches users typing without a Turkish keyboard.
//
// Either signal is enough. False-positive rate is low because the
// listed words are common in Turkish but rare in English SQL contexts.

const TURKISH_CHARS = /[ığşçöüİĞŞÇÖÜ]/;

// Common Turkish words that signal Turkish input. Includes both the
// diacritic and ASCII variants (some users type without ı/ğ/ş/ö/ü when
// they're on an English keyboard or a phone without Turkish layout).
const TURKISH_WORDS = /\b(nasıl|nasil|nedir|neden|niçin|nicin|niye|hata|çalışmıyor|calismiyor|sorgu|tablo|sütun|sutun|satır|satir|kolon|gibi|için|icin|yardım|yardim|merhaba|selam|teşekkür|tesekkur|teşekkürler|tesekkurler|olmuyor|yapamıyorum|yapamiyorum|anlamadım|anlamadim|göstermek|gostermek|değil|degil|nasıldır|nasildir|kullanmak|öğrenmek|ogrenmek|bilmiyorum|bilmiyorm|sorgulama|demek|olabilir mi|var mı|var mi|yok mu|olur mu|misin|musun)\b/i;

/**
 * Detect whether a message is written in Turkish.
 *
 * Returns true if the text contains Turkish-specific characters OR
 * a common Turkish function word. Returns false for empty, null,
 * or non-string input.
 *
 * @param {string} text - The text to analyze
 * @returns {boolean}
 */
export function detectTurkish(text) {
  if (!text || typeof text !== 'string') return false;
  if (TURKISH_CHARS.test(text)) return true;
  if (TURKISH_WORDS.test(text)) return true;
  return false;
}

/**
 * System-prompt prefix that instructs Claude to respond in Turkish.
 *
 * Style guidelines for the Coach in Turkish mode:
 *   - Informal 'sen' form (not 'siz' — audience is bootcamp grads,
 *     CS students, career changers; formality alienates them).
 *   - SQL keywords stay in English (SELECT, JOIN, GROUP BY, etc.).
 *   - Warm but direct; no corporate fluff.
 *   - Mix English technical terms when standard in the Turkish data
 *     community (subquery, primary key, foreign key, query plan).
 *   - Don't translate column names, table names, or function names.
 *
 * Prepended to the existing English system prompt — Claude follows
 * the language directive while keeping all the contextual guidance
 * (skills, diagnosis, structure-revealed flags, etc.) intact.
 */
export const TURKISH_SYSTEM_PROMPT_PREFIX = `IMPORTANT — LANGUAGE DIRECTIVE: The student is writing in Turkish. Respond in Turkish using informal 'sen' form (not formal 'siz').

Turkish style:
- Keep all SQL keywords (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, HAVING, LIMIT, CASE WHEN, etc.) in English. Only translate explanations and reasoning.
- Sound like a friendly Turkish tutor — warm, direct, no corporate fluff. Match the student's energy.
- Audience: bootcamp grads, CS students, and career changers learning SQL for data jobs in Türkiye.
- Mix common English technical terms (subquery, primary key, foreign key, query plan) when they're standard in the Turkish data community.
- Do not translate column names, table names, or SQL function names — they stay as-is.

`;

export default detectTurkish;
