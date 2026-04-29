#!/usr/bin/env node
//
// scripts/build-sector-landings.js
//
// Generates SEO landing pages for each sector — one per sector, written
// to public/<slug>/index.html. Templated from /turkce-sql-ogren/ (the
// canonical landing-page template) but with sector-specific:
//
//   - Title + meta description with sector keywords
//   - Hero copy + sector emoji
//   - "Real data" callout block (which dataset, what tables, what licence)
//   - 3 sample challenges (deep links into /app.html?challenge=N)
//   - Sector-specific FAQ
//   - Attribution footer
//   - CTA links carry ?ref=lp_<sector>&goals=mentor for attribution
//
// Run anytime sectors.js or sector-challenges.js changes:
//   node scripts/build-sector-landings.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ─── Per-sector content (hand-authored copy + sample picks) ──────────

const SECTORS = [
  {
    id: 'finans',
    slug: 'finans-sql',
    emoji: '🏦',
    tr_name: 'Finans & Bankacılık',
    en_name: 'Finance & Banking',
    accent_hex: '#10b981',          // green — money/finance
    accent_rgba: 'rgba(16,185,129,',
    title_tr: 'Finans & Bankacılık SQL — Gerçek FDIC Verisi ile Pratik | SQL Quest',
    description_tr: 'JPMorgan, BoA, Citi gibi 200 ABD bankasının gerçek FDIC verisiyle SQL öğren. RSSD ID, tier1 ratio, NPL, fraud pattern\'ları. 20 challenge, real banker schema, ücretsiz başla.',
    keywords_tr: 'finans SQL, bankacılık SQL, fintech SQL, FDIC veri, tier1 capital, NPL ratio, mülakat, banka veri analisti, fraud detection SQL',
    hero_pretitle: '🏦 Gerçek FDIC verisi',
    hero_h1_top: 'Bankacılığın gerçek',
    hero_h1_bottom: 'verisiyle SQL öğren.',
    hero_lead: '200 büyük ABD bankasının çeyrek-bazlı financial verisi (FDIC public domain). Real RSSD/CERT IDs, tier1 capital ratio, NPL ratio, transaction fraud pattern\'ları. Bankacılık geçmişin varsa 30 saniyede tanıdık schema göreceksin.',
    pills: [
      { title: 'Real RSSD/CERT', sub: 'Banker schema — fake yok' },
      { title: 'Tier1, NPL, ROA', sub: 'Regulatory metric\'ler' },
      { title: 'Fraud + churn', sub: 'Risk side de var' },
    ],
    dataset_block: {
      title: 'Hangi veri?',
      blurb: 'FDIC BankFind Suite (banks.data.fdic.gov) — U.S. Government public domain (17 USC §105), commercially redistributable. JPMorgan ($3.75T), BoA, Citi, Wells Fargo, Capital One, Goldman gibi top 200 banka.',
      tables: [
        { name: 'institutions', rows: '200', desc: 'Top US bankalar — ad, şehir, eyalet, varlık, mevduat, kuruluş tarihi' },
        { name: 'financials', rows: '763', desc: '4 çeyrek financials — net_income, tier1_ratio, npl_ratio, ROA, ROE' },
        { name: 'branches', rows: '214', desc: 'Şube örneklemi — top 50 banka × ortalama 5 şube' },
        { name: 'failures', rows: '600', desc: 'En yakın 25 yılın bank failure\'ları — kapanış tarihleri, kayıp tahmini' },
        { name: 'summary_state', rows: '60', desc: 'Eyalet-bazlı özetler — community bank yıllık aggregate' },
      ],
      attribution: 'Veri: FDIC BankFind Suite — U.S. Government public domain. Ücretsiz redistribusyon serbest.',
    },
    sample_challenges: [
      { id: 200, title: 'Top 10 Banks by Assets', difficulty: 'Easy', preview: 'JPMorgan, BoA, Citi… aktif varlığa göre top 10. SELECT + ORDER BY + LIMIT.' },
      { id: 211, title: 'Avg Tier 1 Ratio Per State', difficulty: 'Medium', preview: 'JOIN institutions ↔ financials. Eyalet bazlı avg tier1, en az 3 banka.' },
      { id: 216, title: 'Top 3 Banks Per State by Assets', difficulty: 'Hard', preview: 'Window function — RANK() OVER (PARTITION BY state). Eyalet leaderboard\'ları.' },
    ],
    faqs: [
      ['Veri gerçekten gerçek mi?', 'Evet. FDIC BankFind Suite public API — JPMorgan Chase\'in $3.75T total assets değeri, kuruluş yılı 1824 — hepsi gerçek. Sentetik değil. U.S. Government public domain (17 USC §105), commercial use serbest.'],
      ['Türkiye\'de banka mı çalışıyorum, ABD bankaları mı?', 'Schema universal — tier1, NPL, ROA, transaction tablolarının yapısı her bankada aynı. Garanti, İş Bankası, Akbank\'ta da bu sütunları görürsün. Mülakatta Garanti soruyu "ABD bankası neden daha kârlı?" sormaz, "tier1 ne anlama gelir?" sorar.'],
      ['FAANG mülakatına da iyi mi?', 'Stripe, JPMorgan Chase\'in technology arm, Capital One — bu şirketler finans-shaped data ile çalışır. Coach seni finans tagged challenge\'lara öncelik vererek yönlendirir.'],
      ['Üretim, e-ticaret de var mı?', 'Üretim (UCI AI4I 2020 — Siemens/GE benchmark) ve gayrimenkul (NYC OpenData) sektörleri de hazır. Mentor onboarding\'inde sektörünü söyle, Coach ona göre prioritize ediyor.'],
      ['$19/ay Pro\'ya ihtiyacım var mı?', 'Free tier 20 challenge\'ın hepsini çözmeye yeter (ücretsiz). Pro Hard challenge\'ları ve unlimited AI tutor açıyor. Bankacı kariyerine ciddiysen Pro\'ya değer.'],
    ],
  },

  {
    id: 'gayrimenkul',
    slug: 'gayrimenkul-sql',
    emoji: '🏠',
    tr_name: 'Gayrimenkul',
    en_name: 'Real Estate',
    accent_hex: '#f59e0b',          // amber — property/realty
    accent_rgba: 'rgba(245,158,11,',
    title_tr: 'Gayrimenkul SQL — NYC OpenData ile Real Estate Analytics | SQL Quest',
    description_tr: 'Gerçek NYC emlak verisi (PLUTO + ACRIS + DOB). BBL, deed/mortgage transaction\'ları, alıcı/satıcı, permit\'ler. 20 challenge, real estate analyst schema, ücretsiz başla.',
    keywords_tr: 'gayrimenkul SQL, emlak veri analizi, NYC PLUTO, ACRIS, BBL, real estate analytics, property data, listings SQL',
    hero_pretitle: '🏠 Gerçek NYC emlak verisi',
    hero_h1_top: 'New York gayrimenkul',
    hero_h1_bottom: 'verisiyle SQL öğren.',
    hero_lead: 'NYC OpenData PLUTO + ACRIS + DOB. Manhattan ve Brooklyn property\'leri, deed/mortgage işlemleri, alıcı/satıcı bilgileri, building permit\'ler. Real BBL\'ler, real ACRIS doc_type\'ları — emlak analist tanır.',
    pills: [
      { title: 'BBL identifier', sub: 'NYC standard property ID' },
      { title: 'ACRIS deed/mortgage', sub: 'Real legal types' },
      { title: 'DOB permits', sub: 'Construction signal' },
    ],
    dataset_block: {
      title: 'Hangi veri?',
      blurb: 'NYC OpenData (opendata.cityofnewyork.us). NYC OpenData Terms — commercial redistribution permitted with attribution. Manhattan + Brooklyn fokuslu, 4400+ row, gerçek BBL ve owner isimleri.',
      tables: [
        { name: 'properties', rows: '500', desc: 'PLUTO — bbl, borough, address, bldg_class, year_built, assess_total, owner_name' },
        { name: 'sales', rows: '500', desc: 'ACRIS Master — deed/mortgage documents, document_amt, document_date' },
        { name: 'sales_legals', rows: '1500', desc: 'Document → BBL bridge — bir deed birden çok lot kapsayabilir' },
        { name: 'sales_parties', rows: '1354', desc: 'Buyer + seller per document — LLC analizleri için ideal' },
        { name: 'permits', rows: '500', desc: 'DOB permit issuance — construction activity, owner business types' },
      ],
      attribution: 'Veri: NYC OpenData (PLUTO + ACRIS + DOB). NYC OpenData Terms — commercial use permitted with attribution.',
    },
    sample_challenges: [
      { id: 220, title: 'Top 10 Manhattan Properties by Assessed Value', difficulty: 'Easy', preview: 'Manhattan\'ın en değerli 10 binası. WHERE + ORDER BY.' },
      { id: 233, title: 'Top Buyers by Volume', difficulty: 'Medium', preview: 'CTE + JOIN — sales_parties + sales toplam deal volume\'ı.' },
      { id: 236, title: 'Top 3 Sales Per Borough', difficulty: 'Hard', preview: 'Window function — RANK() OVER (PARTITION BY borough). Borough deal leaderboard\'ları.' },
    ],
    faqs: [
      ['Veri gerçekten gerçek mi?', 'Evet. NYC OpenData public API — Aug 2025\'teki $1.08B Manhattan deed gerçek. 1920 yapımı Brooklyn binası gerçek. NYC OpenData Terms commercial use\'a izin veriyor.'],
      ['Türkiye\'de gayrimenkul mü çalışıyorum, NYC mı?', 'Schema universal. Property → sale → buyer → permit yapısı her şehirde aynı. Hepsiemlak\'ın schema\'sı da PLUTO\'ya çok benzer. BBL yerine TC Kimlik No, ACRIS yerine Tapu Müdürlüğü.'],
      ['Sadece New York\'a mı odaklı?', 'Şu an evet — public real estate data en zengin orada. Gelecekte Türkiye Tapu Müdürlüğü veya Hepsiemlak public dataset\'i eklersek genişletiriz.'],
      ['LLC alıcı analizleri yapabilir miyim?', 'Evet — sales_parties tablosu real buyer isimleri içeriyor (LLC, INC, CORP, TRUST gibi). Çoğu Manhattan deal\'i LLC üzerinden. Challenge #234 tam bunu kapsıyor.'],
      ['Pro\'ya ihtiyacım var mı?', 'Free tier 20 challenge\'ın hepsini çözmeye yeter. Pro AI tutor unlimited + Hard challenge\'lar açıyor.'],
    ],
  },

  {
    id: 'uretim',
    slug: 'uretim-sql',
    emoji: '🏭',
    tr_name: 'Üretim & Endüstri',
    en_name: 'Manufacturing & Industry',
    accent_hex: '#3b82f6',          // blue — industrial
    accent_rgba: 'rgba(59,130,246,',
    title_tr: 'Üretim SQL — Predictive Maintenance Benchmark ile | SQL Quest',
    description_tr: 'UCI AI4I 2020 industrial benchmark. Siemens/GE/Honeywell ML ekiplerinin kullandığı standart dataset. Tool wear, torque, FMEA failure modes (TWF, HDF, PWF, OSF, RNF). 20 challenge.',
    keywords_tr: 'üretim SQL, manufacturing SQL, predictive maintenance, AI4I, FMEA, tool wear, sensor data, industrial analytics, Siemens veri',
    hero_pretitle: '🏭 Industrial benchmark dataset',
    hero_h1_top: 'Predictive maintenance',
    hero_h1_bottom: 'verisiyle SQL öğren.',
    hero_lead: 'UCI AI4I 2020 — Siemens, GE Digital, Honeywell ML ekiplerinin predictive maintenance benchmark\'ı. Tool wear, torque, rotational speed, ve gerçek FMEA failure mode\'ları (TWF, HDF, PWF, OSF, RNF). Üretim mühendisi schema\'yı tanır.',
    pills: [
      { title: 'FMEA failure modes', sub: 'TWF / HDF / PWF / OSF / RNF' },
      { title: 'Real sensor schema', sub: 'rpm, torque, temp_k' },
      { title: 'Quality grades', sub: 'L / M / H per industry' },
    ],
    dataset_block: {
      title: 'Hangi veri?',
      blurb: 'UCI ML Repository — AI4I 2020 (Matzka, S., 2020). CC BY 4.0. **Önemli disclosure:** Bu dataset endüstri-standart predictive maintenance benchmark — Siemens/GE/Honeywell internal ML training\'inde kullanılıyor. Schema gerçek (rotational_speed_rpm, torque_nm, FMEA modes) ama row\'lar synthetic — gerçek factory floor IoT data permissive license altında public değil.',
      tables: [
        { name: 'products', rows: '1000', desc: 'Per-unit metadata — udi, product_id, type (L/M/H), tool_wear_min' },
        { name: 'operational_data', rows: '1000', desc: 'Sensor okumaları — air_temp_k, process_temp_k, rotational_speed_rpm, torque_nm' },
        { name: 'failure_events', rows: '1000', desc: 'Failure flag\'leri — machine_failure + 5 mode (TWF, HDF, PWF, OSF, RNF)' },
        { name: 'failure_modes', rows: '5', desc: 'Lookup — code, name, fmea_category, description' },
      ],
      attribution: 'Veri: UCI ML Repository — AI4I 2020 Predictive Maintenance Dataset (Matzka 2020), CC BY 4.0. Industrial benchmark, raw factory data değil.',
    },
    sample_challenges: [
      { id: 240, title: 'Top 10 by Tool Wear', difficulty: 'Easy', preview: 'En çok aşınmış tool\'ları sırala — replacement threshold (~200 dk) yakını.' },
      { id: 251, title: 'Failure Rate Per Quality Type', difficulty: 'Medium', preview: 'JOIN products + failure_events. L/M/H quality\'nin failure rate\'i.' },
      { id: 258, title: 'Failure Rate by Torque Bucket', difficulty: 'Hard', preview: 'Multi-CTE — torque bucket\'larına göre per-quality failure rate. Predictive signal.' },
    ],
    faqs: [
      ['Veri gerçekten gerçek mi?', 'Net olalım: dataset SYNTHETIC ama industrial benchmark. UCI AI4I 2020 — Siemens/GE/Honeywell ML ekiplerinin kullandığı standart predictive maintenance dataset\'i. Schema gerçek (rotational_speed_rpm, FMEA failure codes), data row\'ları Matzka 2020 paper\'ında matematiksel formüllerle generate edildi. Real factory IoT data permissive license altında public değil — bu en yaklaşıbilen.'],
      ['Türkiye\'de fabrika çalışıyorum, ABD endüstrisi mı?', 'Schema universal. FMEA codes (TWF, HDF, PWF, OSF, RNF) global maintenance engineering standartı — Tüpraş, Bosch Turkey, Aselsan\'da da aynı kategoriler. Sensor parametre adları (rotational_speed_rpm, torque_nm, tool_wear_min) ISO standartı.'],
      ['Real factory data nereden bulurum?', 'Public olarak yok. Lisans-locked: Bosch Production Line (Kaggle competition-only), Siemens Predictive Maintenance API (kurumsal). AI4I academic-rigorous synthetic alternative — onay altında redistribution serbest.'],
      ['Coach beni FMEA-spesifik yönlendirir mi?', 'Evet. Mentor onboarding\'de "üretim sektöründeyim" dediğinde Coach üretim challenge\'larını öne alıyor + AI Tutor sektörel context veriyor (sensor parametreleri, FMEA terminology).'],
      ['Pro\'ya ihtiyacım var mı?', 'Free tier 20 challenge\'ın hepsini çözmeye yeter. Pro AI tutor unlimited + Hard challenge\'lar açıyor (#256-258 hard tier window function + multi-CTE).'],
    ],
  },
];

// ─── Template generator ──────────────────────────────────────────────

function generateLandingHtml(s) {
  const accentDark = s.accent_rgba + '0.08)';
  const accentMid = s.accent_rgba + '0.25)';
  const accentLight = s.accent_rgba + '0.12)';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <script src="/ref-track.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${s.title_tr}</title>
  <meta name="description" content="${s.description_tr}">
  <meta name="keywords" content="${s.keywords_tr}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://sqlquest.app/${s.slug}/">
  <link rel="alternate" hreflang="tr" href="https://sqlquest.app/${s.slug}/">
  <link rel="alternate" hreflang="x-default" href="https://sqlquest.app/">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${s.emoji}</text></svg>">

  <meta property="og:type" content="website">
  <meta property="og:url" content="https://sqlquest.app/${s.slug}/">
  <meta property="og:site_name" content="SQL Quest">
  <meta property="og:title" content="${s.title_tr}">
  <meta property="og:description" content="${s.description_tr}">
  <meta property="og:image" content="https://sqlquest.app/og-image.png">
  <meta property="og:locale" content="tr_TR">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${s.title_tr}">
  <meta name="twitter:description" content="${s.description_tr}">
  <meta name="twitter:image" content="https://sqlquest.app/og-image.png">

  <script>
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/insights/script.js"></script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "${s.tr_name} için SQL — ${s.en_name} sector data",
    "description": ${JSON.stringify(s.description_tr)},
    "inLanguage": "tr",
    "provider": { "@type": "Organization", "name": "SQL Quest", "sameAs": "https://sqlquest.app/" },
    "url": "https://sqlquest.app/${s.slug}/",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD", "category": "free" }
  }
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}::selection{background:#7c3aed55;color:#fff}html{scroll-behavior:smooth}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;overflow-x:hidden}
    @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}@keyframes gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes pulse-glow{0%,100%{opacity:.4}50%{opacity:.8}}
    .fd{font-family:'Space Grotesk',sans-serif}.fm{font-family:'JetBrains Mono','Fira Code',monospace}
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;transition:all .3s}.nav.s{background:rgba(6,6,15,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}.nl{display:flex;align-items:center;gap:24px}.nl a{color:#94a3b8;text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}.nl a:hover{color:#e2e8f0}
    .btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;font-weight:700;cursor:pointer;transition:all .3s;text-decoration:none;border:none}.bp{padding:13px 32px;font-size:15px;background:linear-gradient(135deg,${s.accent_hex},#7c3aed);color:#fff}.bp:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${accentMid}}.bo{padding:11px 24px;font-size:14px;background:transparent;color:${s.accent_hex};border:1px solid ${accentMid}}.bo:hover{background:${accentLight};transform:translateY(-2px)}.blg{padding:16px 40px;font-size:17px}
    .sec{max-width:1100px;margin:0 auto;padding:100px 24px}.sl{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px}.st{font-size:clamp(28px,3.5vw,44px);font-weight:800;margin-top:12px;line-height:1.15}
    .hero{position:relative;min-height:70vh;display:flex;align-items:center;overflow:hidden}.hbg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -20%,${accentDark} 0%,rgba(124,58,237,.10) 50%,transparent 70%)}.ho1{position:absolute;top:15%;left:8%;width:450px;height:450px;border-radius:50%;background:radial-gradient(circle,${accentDark},transparent 70%);animation:float 8s ease-in-out infinite;filter:blur(50px)}.ho2{position:absolute;bottom:10%;right:5%;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(124,58,237,.08),transparent 70%);animation:float 10s ease-in-out infinite 2s;filter:blur(50px)}
    .gt{background:linear-gradient(135deg,${s.accent_hex},#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-size:200% 200%;animation:gradient-shift 4s ease infinite}
    .hb{display:inline-flex;align-items:center;gap:8px;background:${accentLight};border:1px solid ${accentMid};border-radius:100px;padding:6px 16px;margin-bottom:28px}.pd{width:8px;height:8px;border-radius:4px;background:#22c55e;animation:pulse-glow 2s infinite}
    .pills{display:flex;gap:18px;margin-top:36px;flex-wrap:wrap;justify-content:center}.pill{display:flex;align-items:flex-start;gap:8px}.pill .pdot{width:6px;height:6px;border-radius:3px;background:#22c55e;flex-shrink:0;margin-top:7px}
    .feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}.feat-card{background:rgba(15,15,30,.5);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:24px 22px;transition:border-color .3s}.feat-card:hover{border-color:${accentMid}}
    .schema-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:28px}.schema-card{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:18px 18px}.schema-name{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:${s.accent_hex};margin-bottom:6px}.schema-rows{font-size:11px;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px}.schema-desc{font-size:13px;color:#94a3b8;line-height:1.6}
    .ch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:28px}.ch-card{display:block;background:rgba(15,15,30,.55);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px 22px;text-decoration:none;transition:all .3s}.ch-card:hover{border-color:${accentMid};transform:translateY(-2px)}.ch-diff{display:inline-block;font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;margin-bottom:10px}.ch-easy{background:rgba(34,197,94,.15);color:#4ade80}.ch-medium{background:rgba(251,191,36,.15);color:#fbbf24}.ch-hard{background:rgba(239,68,68,.15);color:#f87171}.ch-title{font-size:16px;font-weight:800;color:#f1f5f9;margin-bottom:8px}.ch-prev{font-size:13px;color:#94a3b8;line-height:1.6}
    .fi{border-bottom:1px solid rgba(255,255,255,.06);padding:20px 0;cursor:pointer}.fh{display:flex;justify-content:space-between;align-items:center}.ftg{color:${s.accent_hex};font-size:22px;transition:transform .3s;flex-shrink:0}.fa{max-height:0;overflow:hidden;transition:max-height .4s ease}.fi.o .fa{max-height:400px}.fi.o .ftg{transform:rotate(45deg)}
    .cs{position:relative;overflow:hidden}.cbg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 50% at 50% 100%,rgba(124,58,237,.12) 0%,transparent 60%)}
    .ft{border-top:1px solid rgba(255,255,255,.06);padding:40px 24px;text-align:center}.flk{margin-top:20px;display:flex;justify-content:center;gap:24px;flex-wrap:wrap}.flk a{color:#64748b;text-decoration:none;font-size:13px;transition:color .2s}.flk a:hover{color:#e2e8f0}
    .attrib-block{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px 24px;margin-top:36px;font-size:13px;line-height:1.7;color:#94a3b8}.attrib-block strong{color:#cbd5e1;font-weight:700}
    @media(max-width:768px){.nl > a:not(.btn){display:none}.nl .bp{font-size:13px;padding:9px 14px}}
  </style>
</head>
<body>

<nav class="nav" id="nav"><div class="ni">
  <a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;">
    <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,${s.accent_hex},#7c3aed);display:flex;align-items:center;justify-content:center;font-size:18px;">⚡</div>
    <span class="fd" style="font-size:20px;font-weight:800;">SQL Quest</span>
  </a>
  <div class="nl">
    <a href="/turkce-sql-ogren/">Türkçe</a><a href="#dataset">Veri</a><a href="#challenges">Challenge</a><a href="#faq">SSS</a>
    <a href="/app.html?lang=tr&sector=${s.id}&challenge=${s.sample_challenges[0].id}&ref=lp_${s.id}" class="btn bp" style="font-size:14px;padding:10px 24px;">Hemen Başla →</a>
  </div>
</div></nav>

<!-- ── Hero ──────────────────────────────────────────────────── -->
<section class="hero"><div class="hbg"></div><div class="ho1"></div><div class="ho2"></div>
  <div class="sec" style="padding-top:140px;padding-bottom:60px;text-align:center;position:relative;z-index:2;">
    <div class="hb" style="animation:fadeUp .6s .1s both;"><span class="pd"></span><span style="font-size:13px;font-weight:600;color:${s.accent_hex};">${s.hero_pretitle}</span></div>
    <h1 class="fd" style="font-size:clamp(36px,5vw,60px);font-weight:800;line-height:1.08;margin-bottom:24px;animation:fadeUp .6s .2s both;">${s.hero_h1_top}<br><span class="gt">${s.hero_h1_bottom}</span></h1>
    <p style="font-size:18px;line-height:1.8;color:#94a3b8;margin-bottom:36px;max-width:680px;margin-left:auto;margin-right:auto;animation:fadeUp .6s .3s both;">${s.hero_lead}</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;animation:fadeUp .6s .4s both;">
      <a href="/app.html?lang=tr&sector=${s.id}&challenge=${s.sample_challenges[0].id}&ref=lp_${s.id}" class="btn bp">Hemen Başla — Ücretsiz</a>
      <a href="#dataset" class="btn bo">Veriyi gör ↓</a>
    </div>
    <div class="pills" style="animation:fadeUp .6s .5s both;">
      ${s.pills.map(p => `<div class="pill"><span class="pdot"></span><div><p style="font-size:13px;font-weight:700;color:#e2e8f0;">${p.title}</p><p style="font-size:11px;color:#64748b;">${p.sub}</p></div></div>`).join('')}
    </div>
  </div>
</section>

<!-- ── Dataset block ─────────────────────────────────────────── -->
<section id="dataset"><div class="sec">
  <div style="text-align:center;margin-bottom:32px;">
    <span class="sl" style="color:${s.accent_hex};">${s.dataset_block.title}</span>
    <h2 class="st fd">5 tablo, real ${s.tr_name.toLowerCase()} schema</h2>
    <p style="font-size:15px;color:#94a3b8;margin-top:16px;max-width:720px;margin:16px auto 0;line-height:1.7;">${s.dataset_block.blurb}</p>
  </div>
  <div class="schema-grid">
    ${s.dataset_block.tables.map(t => `<div class="schema-card">
      <div class="schema-name">${t.name}</div>
      <div class="schema-rows">${t.rows} rows</div>
      <div class="schema-desc">${t.desc}</div>
    </div>`).join('')}
  </div>
  <div class="attrib-block">
    <strong>Veri kaynağı + lisans:</strong> ${s.dataset_block.attribution}
  </div>
</div></section>

<!-- ── Sample challenges ─────────────────────────────────────── -->
<section id="challenges" style="background:linear-gradient(180deg,${accentDark} 0%,transparent 100%);"><div class="sec">
  <div style="text-align:center;margin-bottom:32px;">
    <span class="sl" style="color:${s.accent_hex};">Örnek challenge'lar</span>
    <h2 class="st fd">Coach\'un seninle çalışacağı sorular</h2>
    <p style="font-size:15px;color:#94a3b8;margin-top:16px;max-width:660px;margin:16px auto 0;line-height:1.7;">20 challenge mevcut, hepsi gerçek sektör verisi üzerinde. Burada 3 örnek — Easy / Medium / Hard.</p>
  </div>
  <div class="ch-grid">
    ${s.sample_challenges.map(c => `<a href="/app.html?challenge=${c.id}&lang=tr&ref=lp_${s.id}" class="ch-card">
      <div class="ch-diff ch-${c.difficulty.toLowerCase()}">${c.difficulty}</div>
      <div class="ch-title">${c.title}</div>
      <div class="ch-prev">${c.preview}</div>
    </a>`).join('')}
  </div>
  <div style="text-align:center;margin-top:40px;">
    <a href="/app.html?lang=tr&sector=${s.id}&challenge=${s.sample_challenges[0].id}&ref=lp_${s.id}" class="btn bp">Tümünü Görmek İçin Başla →</a>
  </div>
</div></section>

<!-- ── FAQ ─────────────────────────────────────────────────────── -->
<section id="faq" style="background:rgba(255,255,255,.012);border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="max-width:720px;" id="faqc">
  <h2 class="fd" style="font-size:32px;font-weight:800;text-align:center;margin-bottom:48px;">Sıkça Sorulanlar</h2>
</div></section>

<!-- ── Final CTA ──────────────────────────────────────────────── -->
<section class="cs"><div class="cbg"></div><div class="sec" style="text-align:center;position:relative;z-index:2;">
  <h2 class="fd" style="font-size:clamp(30px,4.5vw,48px);font-weight:800;line-height:1.15;margin-bottom:20px;">${s.tr_name} için<br><span class="gt">SQL pratik başlasın.</span></h2>
  <p style="font-size:18px;color:#94a3b8;max-width:540px;margin:0 auto 32px;">Kayıt yok. Kart yok. İlk sorgun 60 saniyede.</p>
  <a href="/app.html?lang=tr&sector=${s.id}&challenge=${s.sample_challenges[0].id}&ref=lp_${s.id}" class="btn bp blg" style="box-shadow:0 0 40px ${accentMid};">Başlat — Ücretsiz ⚡</a>
  <p style="font-size:13px;color:#475569;margin-top:20px;">Tarayıcıda çalışır. Kurulum yok.</p>
</div></section>

<!-- ── Footer ─────────────────────────────────────────────────── -->
<footer class="ft"><div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:16px;"><div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,${s.accent_hex},#7c3aed);display:flex;align-items:center;justify-content:center;font-size:14px;">⚡</div><span class="fd" style="font-size:16px;font-weight:800;">SQL Quest</span></div>
<p style="font-size:13px;color:#475569;">Sektörünün gerçek verisiyle SQL pratiği.</p>
<div class="flk"><a href="/app.html?lang=tr&sector=${s.id}&challenge=${s.sample_challenges[0].id}&ref=lp_${s.id}">Hemen Başla</a><a href="/turkce-sql-ogren/">Türkçe ana sayfa</a><a href="/finans-sql/">Finans</a><a href="/gayrimenkul-sql/">Gayrimenkul</a><a href="/uretim-sql/">Üretim</a></div>
<p style="font-size:11px;color:#334155;margin-top:24px;">© 2026 SQL Quest</p></footer>

<script>
window.addEventListener('scroll',()=>{document.getElementById('nav').classList.toggle('s',window.scrollY>50)},{passive:true});
const FAQS=${JSON.stringify(s.faqs)};
const faqc=document.getElementById('faqc');
FAQS.forEach(f=>{const d=document.createElement('div');d.className='fi';d.innerHTML=\`<div class="fh"><p style="font-size:16px;font-weight:700;color:#e2e8f0;padding-right:16px">\${f[0]}</p><span class="ftg">+</span></div><div class="fa"><p style="font-size:14px;line-height:1.8;color:#94a3b8;padding-top:12px">\${f[1]}</p></div>\`;d.addEventListener('click',()=>d.classList.toggle('o'));faqc.appendChild(d);});
</script>

</body>
</html>
`;
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  console.log('Generating sector landing pages...\n');
  for (const s of SECTORS) {
    const outDir = path.join(PUBLIC, s.slug);
    fs.mkdirSync(outDir, { recursive: true });
    const html = generateLandingHtml(s);
    const outFile = path.join(outDir, 'index.html');
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`  ✓ ${s.slug}/index.html  (${html.length} bytes, ${s.faqs.length} FAQs, ${s.sample_challenges.length} sample challenges)`);
  }
  console.log(`\nWrote ${SECTORS.length} landing pages to public/\n`);
}

main();
