// Internationalization registry — added May 2026 after Elena's "filtreler
// kafa karıştırıcı, bazı kelimeler Türkçe bazı İngilizce" feedback.
//
// Single source of truth for every translatable string in the app.
// Designed to scale: adding a new language is a single new top-level
// entry plus a new SUPPORTED_LANGS row. Strings are organized by
// namespace ('common', 'nav', 'practice', etc.) so a future split into
// per-section JSON files is mechanical.
//
// USAGE:
//   import { t, setLang, useLanguage } from './utils/i18n.js';
//   t('practice', 'search')            // → "Search by name, id..." (en) / "İsim..." (tr)
//   t('common', 'showing', { n: 12, total: 198 })  // → "Showing 12 of 198"
//   setLang('tr')                       // → switches and notifies subscribers
//
// FALLBACK CHAIN:
//   1. requested language + namespace + key
//   2. English (canonical) namespace + key
//   3. the key itself (so missing translations are still readable)
//
// To add a new language (e.g. Spanish):
//   1. Add `es: { common: {...}, ... }` block to TRANSLATIONS below.
//   2. Add `{ code: 'es', label: 'Español', flag: '🇪🇸' }` to SUPPORTED_LANGS.
//   3. That's it — switcher picks it up automatically.

// ─── Supported languages ───────────────────────────────────────────────
//
// `wip: true` flags a language as work-in-progress: it shows in the
// language menu but with a "(beta)" tag and English fallbacks fill any
// missing strings. Use this when a translation is partially complete.
export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'tr', label: 'Türkçe',  flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸', wip: true },
];

const FALLBACK_LANG = 'en';

// ─── Translation registry ──────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    // App-wide common labels
    common: {
      all: 'All', save: 'Save', cancel: 'Cancel', close: 'Close',
      ok: 'OK', back: 'Back', next: 'Next', previous: 'Previous',
      submit: 'Submit', clear: 'Clear', loading: 'Loading…',
      yes: 'Yes', no: 'No',
      showing: 'Showing {n} of {total} {label}',
      challenges: 'challenges', search: 'Search',
      free: 'Free', pro: 'Pro',
      language: 'Language',
    },

    // Top navigation tabs + the row of utility buttons (Daily/WarmUp/etc.)
    nav: {
      coach: 'Coach', practice: 'Practice', interview: 'Interview',
      board: 'Board', profile: 'Profile',
      daily: 'Daily', dailyDone: 'Done',
      warmup: 'Warm Up', weekly: 'Weekly',
      thirtyDay: '30-Day', dayN: 'Day {n}',
      goals: 'Goals',
      practiceLabel: 'Practice', coachLabel: 'Coach',
    },

    // Welcome-back card on the practice/home dashboard
    welcome: {
      title: '👋 Welcome back',
      titleShort: 'Welcome back!',
      lastSessionDaysAgo: 'Last session — {n} days ago',
      lastSessionToday: 'Last session — today',
      lastSessionYesterday: 'Last session — yesterday',
      attempted: 'ATTEMPTED', solved: 'SOLVED', topFocus: 'TOP FOCUS',
      level: 'Level {n}',
      resumeLabel: 'Resume where you left off:',
      pickUpHint: 'Pick up where you left off.',
      jumpBackIn: 'Jump back in',
      continueColon: 'Continue:',
      continuePrefix: '▶ Continue: {title}',
    },

    // SQL Challenges section header + meta
    challenges: {
      title: 'SQL Challenges',
      subtitle: 'LeetCode-style problems to test your skills',
      solvedCount: 'Solved: {n}/{total}',
      // Sub-tabs inside the Practice tab
      tabChallenges: 'Challenges',
      tabSpeedMode: 'Speed Mode',
      tabDrills: 'Drills',
      tabReadSQL: 'Read SQL',
    },

    // Practice tab — covered fully (was tPractice)
    practice: {
      view: 'View', allChallenges: 'All Challenges', learningPath: 'Learning Path',
      difficulty: 'Difficulty', status: 'Status',
      easy: 'Easy', medium: 'Medium', hard: 'Hard',
      unsolved: 'Unsolved', started: 'Started', solved: 'Solved',
      moreFilters: 'More filters', moreFiltersHide: 'Hide filters',
      company: 'Company', sector: 'Sector',
      activeFilters: 'Active filters', clearAll: 'Clear all',
      noResults: 'No challenges match these filters',
      noResultsHint: 'Try clearing one of the active filters above.',
      search: 'Search by name, id, skill, or company',
      searchClear: 'Clear search',
      noSearchResults: 'No challenges match',
      noSearchHint: 'Try a shorter query, an id like 27, or a skill like "join distinct".',
      backToChallenges: 'Back to Challenges',
      tutorOff: 'Tutor: Off', tutorSmart: 'Tutor: Smart', tutorCoach: 'Tutor: Coach',
      tutorOffMsg: "Live Tutor turned off — you're flying solo.",
      tutorSmartMsg: "Smart mode: I'll only nudge after a wrong submit.",
      tutorCoachMsg: "Coach mode: I'll watch you type and warn on common traps.",
    },

    // Coach tab landing
    coach: {
      title: 'Coach', subtitle: 'Adaptive learning path',
      pickGoal: 'Pick a goal', startNow: 'Start now',
      yourNextStep: 'Your next step', allCaughtUp: "You're all caught up — pick a new goal.",
      // Quick Drill card (auto-targets weakest skill)
      quickDrill: 'QUICK DRILL', yourWeakestSkill: 'YOUR WEAKEST SKILL',
      drillIt: 'Drill it →',
      drillSubtitle: 'One focused challenge. Solves here count {mult}× on the radar.',
      // Focus Tracks card
      focusTracks: 'Focus Tracks',
      focusTracksHelp: 'Curated challenge paths for mastering a specific skill. Solve in order for the smoothest ramp from fundamentals to interview-level.',
      solvedFraction: '{n} / {total} solved',
      // Your goal card
      yourGoal: 'Your goal',
      takePlacement: 'Take placement', retakePlacement: 'Retake placement',
      changeGoal: 'Change goal',
      changeGoalConfirm: 'Change goal? Your radar stays, but this goal\'s step progress resets.',
      pctComplete: '{n}% complete',
      forYou: 'For you:',
    },

    // Auth screens
    auth: {
      login: 'Log in', signup: 'Sign up', logout: 'Log out',
      username: 'Username', password: 'Password',
      forgotPassword: 'Forgot password?',
      orContinueAs: 'Or continue as guest',
      welcome: 'Welcome to SQL Quest',
    },

    // Settings
    settings: {
      title: 'Settings', preferences: 'Preferences',
      languageHelp: 'Choose your preferred language. App restarts automatically.',
    },

    // Profile tab — sub-tabs, archetype card, proficiency, skill map
    profile: {
      tabSkills: 'Skills', tabAchievements: 'Achievements', tabReports: 'Reports',
      skillMapTitle: 'SQL Skill Map',
      yourArchetype: 'YOUR ARCHETYPE',
      profileBtn: 'Profile', shareBtn: 'Share',
      proficiency: 'SQL Proficiency',
      proficiencyBeginner: 'Beginner', proficiencyIntermediate: 'Intermediate',
      proficiencyAdvanced: 'Advanced', proficiencyExpert: 'Expert',
      countStrong: 'Strong', countModerate: 'Moderate',
      countWeak: 'Weak', countNew: 'New',
      yourShape: 'YOUR SHAPE',
      // Radar axis labels — kept as is (these are SQL skill names, brand-neutral)
      // but we still surface short forms in the dictionary so a contributor
      // could localize them (e.g. JOIN → BAĞLAMA) if desired. For now keep en.
    },

    // Leaderboard / Board tab
    board: {
      title: 'Global Leaderboard',
      shareBtn: 'Share', inviteBtn: 'Invite',
      rankGrandmaster: 'Grandmaster', rankMaster: 'Master',
      rankExpert: 'Expert', rankAdvanced: 'Advanced',
      rankIntermediate: 'Intermediate', rankBeginner: 'Beginner',
    },

    // Interview tab
    interview: {
      title: 'SQL Mock Interviews',
      subtitle: 'Practice with timed, real-world interview questions',
      proMember: 'PRO Member',
      interviewsCompleted: 'Interviews Completed', passed: 'Passed',
      avgScore: 'Avg Score', analytics: 'Analytics',
      recommendedForYou: 'Recommended for You',
      retryToImprove: 'Retry "{title}" to improve your score from {pct}%',
      focusAreas: 'Focus areas: {list}',
      startNow: 'Start Now',
      questionsToReview: 'Questions to Review ({n} remaining)',
      viewAllPast: 'View all past interviews →',
    },
  },

  tr: {
    common: {
      all: 'Tümü', save: 'Kaydet', cancel: 'İptal', close: 'Kapat',
      ok: 'Tamam', back: 'Geri', next: 'İleri', previous: 'Önceki',
      submit: 'Gönder', clear: 'Temizle', loading: 'Yükleniyor…',
      yes: 'Evet', no: 'Hayır',
      showing: '{total} {label}\'den {n} tanesi gösteriliyor',
      challenges: 'soru', search: 'Ara',
      free: 'Ücretsiz', pro: 'Pro',
      language: 'Dil',
    },

    nav: {
      coach: 'Koç', practice: 'Pratik', interview: 'Mülakat',
      board: 'Skor', profile: 'Profil',
      daily: 'Günlük', dailyDone: 'Bitti',
      warmup: 'Isınma', weekly: 'Haftalık',
      thirtyDay: '30 Gün', dayN: 'Gün {n}',
      goals: 'Hedefler',
      practiceLabel: 'Pratik', coachLabel: 'Koç',
    },

    welcome: {
      title: '👋 Tekrar hoş geldin',
      titleShort: 'Tekrar hoş geldin!',
      lastSessionDaysAgo: 'Son oturum — {n} gün önce',
      lastSessionToday: 'Son oturum — bugün',
      lastSessionYesterday: 'Son oturum — dün',
      attempted: 'DENENEN', solved: 'ÇÖZÜLEN', topFocus: 'ODAK',
      level: 'Seviye {n}',
      resumeLabel: 'Kaldığın yerden devam:',
      pickUpHint: 'Kaldığın yerden devam et.',
      jumpBackIn: 'Geri dön',
      continueColon: 'Devam:',
      continuePrefix: '▶ Devam: {title}',
    },

    challenges: {
      title: 'SQL Soruları',
      subtitle: 'Becerilerini sınayan LeetCode-tarzı sorular',
      solvedCount: 'Çözülen: {n}/{total}',
      tabChallenges: 'Sorular',
      tabSpeedMode: 'Hız Modu',
      tabDrills: 'Alıştırmalar',
      tabReadSQL: 'SQL Oku',
    },

    practice: {
      view: 'Görünüm', allChallenges: 'Tüm Sorular', learningPath: 'Öğrenme Yolu',
      difficulty: 'Zorluk', status: 'Durum',
      easy: 'Kolay', medium: 'Orta', hard: 'Zor',
      unsolved: 'Çözülmedi', started: 'Başladım', solved: 'Çözüldü',
      moreFilters: 'Daha fazla filtre', moreFiltersHide: 'Filtreleri gizle',
      company: 'Şirket', sector: 'Sektör',
      activeFilters: 'Aktif filtreler', clearAll: 'Hepsini temizle',
      noResults: 'Bu filtrelere uyan soru yok',
      noResultsHint: 'Yukarıdaki filtrelerden birini kaldırmayı dene.',
      search: 'İsim, id, beceri veya şirket ile ara',
      searchClear: 'Aramayı temizle',
      noSearchResults: 'Eşleşen soru yok',
      noSearchHint: 'Daha kısa bir sorgu, "27" gibi bir id, ya da "join distinct" gibi bir beceri dene.',
      backToChallenges: 'Sorulara Dön',
      tutorOff: 'Koç: Kapalı', tutorSmart: 'Koç: Akıllı', tutorCoach: 'Koç: Tam',
      tutorOffMsg: 'Canlı Koç kapatıldı — şimdi tek başına uçuyorsun.',
      tutorSmartMsg: 'Akıllı mod: yalnız yanlış cevap sonrası söyleyeceğim.',
      tutorCoachMsg: 'Tam mod: yazarken seni izleyip yaygın tuzakları uyaracağım.',
    },

    coach: {
      title: 'Koç', subtitle: 'Adaptif öğrenme yolu',
      pickGoal: 'Hedef seç', startNow: 'Şimdi başla',
      yourNextStep: 'Sıradaki adımın', allCaughtUp: 'Tamamladın — yeni bir hedef seç.',
      quickDrill: 'HIZLI ALIŞTIRMA', yourWeakestSkill: 'EN ZAYIF BECERİN',
      drillIt: 'Çalış →',
      drillSubtitle: 'Tek odaklı soru. Buradaki çözümler radarda {mult}× sayılır.',
      focusTracks: 'Odak Yolları',
      focusTracksHelp: 'Belirli bir beceriyi ustalaşmak için seçilmiş soru patikaları. Sırayla çöz: temellerden mülakat seviyesine en pürüzsüz geçiş.',
      solvedFraction: '{n} / {total} çözüldü',
      yourGoal: 'Hedefin',
      takePlacement: 'Seviye testi', retakePlacement: 'Seviyeyi yenile',
      changeGoal: 'Hedefi değiştir',
      changeGoalConfirm: 'Hedefi değiştirmek mi? Radarın kalır ama bu hedefteki adımların sıfırlanır.',
      pctComplete: '%{n} tamamlandı',
      forYou: 'Senin için:',
    },

    auth: {
      login: 'Giriş yap', signup: 'Kayıt ol', logout: 'Çıkış',
      username: 'Kullanıcı adı', password: 'Şifre',
      forgotPassword: 'Şifremi unuttum',
      orContinueAs: 'Ya da misafir olarak devam et',
      welcome: 'SQL Quest\'e hoş geldin',
    },

    settings: {
      title: 'Ayarlar', preferences: 'Tercihler',
      languageHelp: 'Tercih ettiğin dili seç. Uygulama otomatik olarak yenilenecek.',
    },

    profile: {
      tabSkills: 'Beceriler', tabAchievements: 'Başarımlar', tabReports: 'Raporlar',
      skillMapTitle: 'SQL Beceri Haritası',
      yourArchetype: 'TARZIN',
      profileBtn: 'Profil', shareBtn: 'Paylaş',
      proficiency: 'SQL Yetkinliği',
      proficiencyBeginner: 'Başlangıç', proficiencyIntermediate: 'Orta',
      proficiencyAdvanced: 'İleri', proficiencyExpert: 'Uzman',
      countStrong: 'Güçlü', countModerate: 'Orta',
      countWeak: 'Zayıf', countNew: 'Yeni',
      yourShape: 'ŞEKLİN',
    },

    board: {
      title: 'Küresel Sıralama',
      shareBtn: 'Paylaş', inviteBtn: 'Davet et',
      rankGrandmaster: 'Büyük Usta', rankMaster: 'Usta',
      rankExpert: 'Uzman', rankAdvanced: 'İleri',
      rankIntermediate: 'Orta', rankBeginner: 'Başlangıç',
    },

    interview: {
      title: 'SQL Mülakat Provaları',
      subtitle: 'Süreli, gerçek mülakat sorularıyla pratik yap',
      proMember: 'PRO Üye',
      interviewsCompleted: 'Tamamlanan Mülakat', passed: 'Geçilen',
      avgScore: 'Ort. Skor', analytics: 'Analiz',
      recommendedForYou: 'Senin İçin Önerilen',
      retryToImprove: '"{title}"\'yi yeniden dene — skorunu %{pct} üstüne çıkar',
      focusAreas: 'Odak konuları: {list}',
      startNow: 'Şimdi Başla',
      questionsToReview: 'Gözden Geçirilecek Sorular ({n} kaldı)',
      viewAllPast: 'Tüm geçmiş mülakatları gör →',
    },
  },

  // Spanish placeholder. WIP — most strings fall back to English until
  // a Spanish-speaking contributor fills them in. Adding even a few key
  // namespaces (nav, common) is enough for an MVP Spanish UX.
  es: {
    common: {
      all: 'Todos', save: 'Guardar', cancel: 'Cancelar', close: 'Cerrar',
      yes: 'Sí', no: 'No', loading: 'Cargando…',
      language: 'Idioma',
    },
    nav: {
      coach: 'Coach', practice: 'Práctica', interview: 'Entrevista',
      board: 'Ranking', profile: 'Perfil',
    },
    // Other namespaces fall back to English.
  },
};

// ─── State + subscribers ───────────────────────────────────────────────
//
// `currentLang` is the cached active language. We also track listeners
// so React components can re-render on switch without a full reload.
let currentLang = null;
const listeners = new Set();

/**
 * Resolve the active language. Order:
 *   1. Cached value (set by a previous setLang or first call)
 *   2. localStorage `sqlquest_lang` (sticky from URL ?lang=tr or switcher)
 *   3. Browser locale (navigator.language) — TR for tr-TR / tr-CY users
 *   4. FALLBACK_LANG (English)
 */
export function getCurrentLang() {
  if (currentLang) return currentLang;
  try {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('sqlquest_lang')) || null;
    if (stored && TRANSLATIONS[stored]) {
      currentLang = stored;
      return stored;
    }
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browser = navigator.language.toLowerCase();
      // Match prefix so "tr-TR", "tr-CY", "tr" all map to 'tr'.
      const match = SUPPORTED_LANGS.find(l => browser.startsWith(l.code) && !l.wip);
      if (match) {
        currentLang = match.code;
        return match.code;
      }
    }
  } catch (_) { /* localStorage / navigator not available */ }
  currentLang = FALLBACK_LANG;
  return FALLBACK_LANG;
}

/**
 * Switch language. Persists to localStorage AND notifies all subscribers
 * so any React component using `useLanguage()` re-renders. Returns true
 * on success, false if the requested code isn't in TRANSLATIONS.
 */
export function setLang(code) {
  if (!TRANSLATIONS[code]) return false;
  currentLang = code;
  try { localStorage.setItem('sqlquest_lang', code); } catch (_) {}
  // Notify all React subscribers so the tree re-renders.
  listeners.forEach(fn => {
    try { fn(code); } catch (_) {}
  });
  return true;
}

/**
 * Translate a key. `vars` substitutes {placeholders} in the string.
 *
 * Lookup chain:
 *   1. TRANSLATIONS[currentLang][namespace][key]
 *   2. TRANSLATIONS[FALLBACK_LANG][namespace][key]
 *   3. The key itself (so unmapped keys are still readable)
 */
export function t(namespace, key, vars = null) {
  const lang = getCurrentLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS[FALLBACK_LANG];
  const fallback = TRANSLATIONS[FALLBACK_LANG];
  let str =
    (dict[namespace] && dict[namespace][key]) ||
    (fallback[namespace] && fallback[namespace][key]) ||
    key;

  if (vars && typeof str === 'string') {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return str;
}

/**
 * Subscribe to language changes. Returns an unsubscribe function.
 * Used by React's useLanguage() hook in app.jsx.
 */
export function subscribeLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Reset the cache. Used by tests; rarely needed in app code.
 */
export function _resetLangCache() {
  currentLang = null;
}

// Default export for convenience: just the t() helper.
export default t;
