// SQL Quest — Canonical sector registry
//
// MVP ships with 3 sectors. The plan (docs/sector-mvp-plan.md) outlines why
// these 3: validated demand from 1-on-1 tutoring customers (Elena: finans,
// Saida: gayrimenkul, Murat: e-ticaret-adjacent retail).
//
// IDs are stable strings used in:
//   - userData.goals.sector
//   - challenge.sectorTags[]
//   - landing page paths
//   - Supabase user_goals.sector
// NEVER rename an ID without a data migration. Add new sectors by appending
// to the array — Coach engine and badges resolve unknown IDs to "generic".
//
// Display names are localized. Descriptions feed AI Tutor system-prompt
// hints and landing-page hero copy. Sample tables seed AI-Tutor analogies.
//
// To add a sector post-MVP: append a new entry, run the LLM tag pipeline
// (scripts/tag-challenges-by-sector.js) over the existing 245 challenges,
// add a landing page, ship.

window.CANONICAL_SECTORS = [
  {
    id: 'finans',
    tr: 'Finans & Banka',
    en: 'Finance & Banking',
    description_tr: 'Bankacılık, fintech, sigorta — gerçek FDIC verisi (200 ABD bankası), tier1, NPL, fraud pattern, çeyrek-bazlı financials.',
    description_en: 'Banking, fintech, insurance — real FDIC data (200 US banks), tier1, NPL, fraud patterns, quarterly financials.',
    sample_tables: ['institutions', 'financials', 'branches', 'failures', 'summary_state'],
    landing_path: '/finans-sql',
    emoji: '🏦',
    // Dataset key the SQLite-WASM loader uses to find the seed data in
    // window.publicDatasetsData. Pulled in via finans-data.js (generated
    // from FDIC BankFind Suite — US Government public domain).
    dataset_key: 'finans_banking',
    challenge_id_range: [200, 219],
    attribution: 'FDIC BankFind Suite (banks.data.fdic.gov) — U.S. Government public domain',
  },
  {
    id: 'e-ticaret',
    tr: 'E-ticaret & Marketplace',
    en: 'E-commerce & Marketplace',
    description_tr: 'Online perakende, marketplace — cohort retention, sepet analizi, top-N per kategori, conversion funnel.',
    description_en: 'Online retail, marketplaces — cohort retention, basket analysis, top-N per category, conversion funnel.',
    sample_tables: ['orders', 'order_items', 'products', 'customers', 'sessions'],
    landing_path: '/e-ticaret-sql',
    emoji: '🛒',
  },
  {
    id: 'gayrimenkul',
    tr: 'Gayrimenkul',
    en: 'Real Estate',
    description_tr: 'NYC gerçek emlak verisi (PLUTO + ACRIS + DOB) — gerçek BBL\'ler, deed/mortgage işlemleri, alıcı/satıcı, permit\'ler, fiyat trendi.',
    description_en: 'NYC real estate data (PLUTO + ACRIS + DOB) — real BBLs, deed/mortgage transactions, buyers/sellers, permits, price trends.',
    sample_tables: ['properties', 'sales', 'sales_legals', 'sales_parties', 'permits'],
    landing_path: '/gayrimenkul-sql',
    emoji: '🏠',
    dataset_key: 'gayrimenkul_nyc',
    challenge_id_range: [220, 239],
    attribution: 'NYC OpenData (opendata.cityofnewyork.us) — NYC OpenData Terms (commercial use permitted with attribution)',
  },
  {
    id: 'uretim',
    tr: 'Üretim & Endüstri',
    en: 'Manufacturing & Industry',
    description_tr: 'Predictive maintenance benchmark — UCI AI4I 2020. Gerçek FMEA failure mode\'ları (TWF, HDF, PWF, OSF, RNF) ve gerçek industrial sensor parametreleri. Siemens/GE/Honeywell ML ekiplerinin kullandığı standart dataset.',
    description_en: 'Predictive maintenance benchmark — UCI AI4I 2020. Real FMEA failure modes (TWF, HDF, PWF, OSF, RNF) and real industrial sensor parameters. Standard benchmark dataset used by Siemens, GE Digital, and Honeywell ML teams.',
    sample_tables: ['products', 'operational_data', 'failure_events', 'failure_modes'],
    landing_path: '/uretim-sql',
    emoji: '🏭',
    dataset_key: 'uretim_industrial',
    challenge_id_range: [240, 259],
    attribution: 'UCI ML Repository — AI4I 2020 Predictive Maintenance Dataset (Matzka 2020), CC BY 4.0',
  },
];

// Sentinel for "user explicitly skipped sector picker" or "doesn't fit any
// MVP sector". Coach falls back to no-prioritization when sector === GENERIC.
window.GENERIC_SECTOR_ID = 'generic';

// Helper accessors. All return null for unknown / generic IDs so callers
// can use truthy checks (`if (sector) showBadge(...)`) without special-casing.

window.getSectorById = function(id) {
  if (!id || id === window.GENERIC_SECTOR_ID) return null;
  return window.CANONICAL_SECTORS.find((s) => s.id === id) || null;
};

window.getSectorDisplayName = function(id, lang) {
  const s = window.getSectorById(id);
  if (!s) return null;
  return (lang === 'en') ? s.en : s.tr;
};

window.getSectorEmoji = function(id) {
  const s = window.getSectorById(id);
  return s ? s.emoji : '';
};

window.listSectorIds = function() {
  return window.CANONICAL_SECTORS.map((s) => s.id);
};

console.log('[Sectors] Loaded', window.CANONICAL_SECTORS.length, 'sectors');
