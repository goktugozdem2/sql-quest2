import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Vitest runs in node environment by default, so localStorage and navigator
// aren't available. Stub a minimal in-memory localStorage and a stable
// navigator.language ('en-US') BEFORE the i18n module is imported — the
// module reads localStorage in its first getCurrentLang() call.
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    };
  }
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = { language: 'en-US' };
  }
});

const { t, getCurrentLang, setLang, subscribeLang, SUPPORTED_LANGS, _resetLangCache, localizeChallenge } =
  await import('../src/utils/i18n.js');

beforeEach(() => {
  try { localStorage.clear(); } catch (_) {}
  _resetLangCache();
});

describe('i18n', () => {
  describe('getCurrentLang', () => {
    it('returns "en" when no preference is stored and navigator default is en', () => {
      // jsdom defaults navigator.language to 'en-US'
      expect(getCurrentLang()).toBe('en');
    });

    it('returns "tr" when sqlquest_lang=tr in localStorage', () => {
      localStorage.setItem('sqlquest_lang', 'tr');
      _resetLangCache();
      expect(getCurrentLang()).toBe('tr');
    });

    it('caches after first call', () => {
      localStorage.setItem('sqlquest_lang', 'tr');
      _resetLangCache();
      expect(getCurrentLang()).toBe('tr');
      // Even after we change localStorage, cached value persists until reset
      localStorage.setItem('sqlquest_lang', 'en');
      expect(getCurrentLang()).toBe('tr');
    });

    it('falls back to "en" for unknown stored language', () => {
      localStorage.setItem('sqlquest_lang', 'klingon');
      _resetLangCache();
      // Should not pick klingon — falls to navigator default (en).
      expect(getCurrentLang()).toBe('en');
    });
  });

  describe('setLang', () => {
    it('switches the active language and persists', () => {
      expect(setLang('tr')).toBe(true);
      expect(getCurrentLang()).toBe('tr');
      expect(localStorage.getItem('sqlquest_lang')).toBe('tr');
    });

    it('returns false for unsupported language codes', () => {
      expect(setLang('klingon')).toBe(false);
      expect(getCurrentLang()).toBe('en');
    });

    it('notifies subscribers on switch', () => {
      const calls = [];
      const unsub = subscribeLang(code => calls.push(code));
      setLang('tr');
      setLang('en');
      expect(calls).toEqual(['tr', 'en']);
      unsub();
      setLang('tr');
      expect(calls).toEqual(['tr', 'en']); // no further calls after unsub
    });
  });

  describe('t() lookups', () => {
    it('returns English by default', () => {
      expect(t('practice', 'difficulty')).toBe('Difficulty');
      expect(t('common', 'all')).toBe('All');
    });

    it('returns Turkish when lang=tr', () => {
      setLang('tr');
      expect(t('practice', 'difficulty')).toBe('Zorluk');
      expect(t('common', 'all')).toBe('Tümü');
    });

    it('falls back to English when key missing in target lang', () => {
      setLang('es'); // es is WIP — most keys missing
      // 'es' has 'common.all' = 'Todos' (defined)
      expect(t('common', 'all')).toBe('Todos');
      // 'es' doesn\'t have 'practice.difficulty' — fall back to en
      expect(t('practice', 'difficulty')).toBe('Difficulty');
    });

    it('returns the key itself when not found anywhere', () => {
      expect(t('nonexistent', 'foobar')).toBe('foobar');
    });

    it('substitutes {placeholders} from vars', () => {
      const out = t('common', 'showing', { n: 12, total: 198, label: 'challenges' });
      expect(out).toBe('Showing 12 of 198 challenges');
    });

    it('substitutes Turkish placeholders correctly', () => {
      setLang('tr');
      const out = t('common', 'showing', { n: 12, total: 198, label: 'soru' });
      expect(out).toBe("198 soru'den 12 tanesi gösteriliyor");
    });
  });

  describe('localizeChallenge', () => {
    const baseChallenge = {
      id: 1,
      title: 'Class Survival Breakdown',
      description: 'Show **pclass** and **survival_rate**.',
      hint: 'Use SUM(survived).',
      example: { input: 'passengers table', output: '3 rows' },
      solution: 'SELECT pclass FROM passengers',
      tables: ['passengers'],
      difficulty: 'Medium',
      title_tr: 'Sınıf Bazında Hayatta Kalma',
      description_tr: '**pclass** ve **survival_rate** göster.',
      hint_tr: 'SUM(survived) kullan.',
      example_tr: { input: 'passengers tablosu', output: '3 satır' },
    };

    it('returns original challenge when language is English (fallback)', () => {
      setLang('en');
      const out = localizeChallenge(baseChallenge);
      expect(out).toBe(baseChallenge);
    });

    it('returns original challenge when input is null/undefined', () => {
      expect(localizeChallenge(null, 'tr')).toBe(null);
      expect(localizeChallenge(undefined, 'tr')).toBe(undefined);
    });

    it('returns original reference when no _<lang> fields exist', () => {
      const minimal = { id: 99, title: 'Bare', description: 'Bare desc' };
      expect(localizeChallenge(minimal, 'tr')).toBe(minimal);
    });

    it('swaps title/description/hint/example to TR when lang=tr', () => {
      const out = localizeChallenge(baseChallenge, 'tr');
      expect(out.title).toBe('Sınıf Bazında Hayatta Kalma');
      expect(out.description).toBe('**pclass** ve **survival_rate** göster.');
      expect(out.hint).toBe('SUM(survived) kullan.');
      expect(out.example).toEqual({ input: 'passengers tablosu', output: '3 satır' });
    });

    it('keeps technical fields untouched (solution, tables, difficulty, id)', () => {
      const out = localizeChallenge(baseChallenge, 'tr');
      expect(out.solution).toBe(baseChallenge.solution);
      expect(out.tables).toBe(baseChallenge.tables);
      expect(out.difficulty).toBe(baseChallenge.difficulty);
      expect(out.id).toBe(baseChallenge.id);
    });

    it('falls back per-field when only some _tr fields exist', () => {
      const partial = {
        id: 2,
        title: 'EN title',
        description: 'EN desc',
        hint: 'EN hint',
        example: { input: 'EN in', output: 'EN out' },
        title_tr: 'TR başlık',
        // description_tr, hint_tr, example_tr all missing
      };
      const out = localizeChallenge(partial, 'tr');
      expect(out.title).toBe('TR başlık');
      expect(out.description).toBe('EN desc');
      expect(out.hint).toBe('EN hint');
      expect(out.example).toEqual({ input: 'EN in', output: 'EN out' });
    });

    it('uses getCurrentLang() when lang argument omitted', () => {
      setLang('tr');
      const out = localizeChallenge(baseChallenge);
      expect(out.title).toBe('Sınıf Bazında Hayatta Kalma');
    });
  });

  describe('SUPPORTED_LANGS', () => {
    it('lists English first as fallback', () => {
      expect(SUPPORTED_LANGS[0].code).toBe('en');
    });

    it('flags Spanish as work-in-progress', () => {
      const es = SUPPORTED_LANGS.find(l => l.code === 'es');
      expect(es).toBeDefined();
      expect(es.wip).toBe(true);
    });

    it('every language has a code, label, and flag', () => {
      SUPPORTED_LANGS.forEach(l => {
        expect(l.code).toBeTruthy();
        expect(l.label).toBeTruthy();
        expect(l.flag).toBeTruthy();
      });
    });
  });
});
