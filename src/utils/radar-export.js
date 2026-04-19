// Radar share export — turn a skill radar into a 1200×630 PNG (OG-image
// aspect ratio) that users can download or drop onto social platforms.
//
// Implementation: render a standalone HTML/SVG document offscreen, convert
// via the SVG blob → Image → Canvas trick. No headless chrome, no server
// dependency. Works in every modern browser.
//
// Why not html2canvas: brings 200KB of dependency for what's really just
// "draw an SVG to a canvas." This is 80 lines of browser-native code.

import { DEFAULT_SKILLS, DEFAULT_META, normalizeSkills, deriveArchetype } from '../components/SkillRadar.jsx';

/**
 * Build a standalone SVG string of the shareable radar card.
 * Self-contained — inlines all styles, uses only web-safe fonts.
 *
 * @param {Object} skills — skill levels map (any key shape; normalized inside).
 * @param {Object} [opts]
 * @param {string} [opts.handle] — user handle or name to show on the card.
 * @param {number} [opts.width=1200]
 * @param {number} [opts.height=630]
 * @param {string} [opts.brandUrl='sqlquest.io']
 */
export function buildRadarShareSvg(skills, opts = {}) {
  const {
    width = 1200,
    height = 630,
    handle = '',
    brandUrl = 'sqlquest.io',
  } = opts;

  const normalized = normalizeSkills(skills || {});
  const archetype = deriveArchetype(normalized);
  const vals = Object.values(normalized).filter(v => typeof v === 'number');
  const overall = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;

  // Layout: radar centered-left, text block on the right.
  const radarSize = 440;
  const radarCx = 280;
  const radarCy = height / 2;
  const maxR = radarSize / 2 - 60;

  const topics = DEFAULT_SKILLS;
  const numTopics = topics.length;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / numTopics - Math.PI / 2;
    const r = (v / 100) * maxR;
    return { x: radarCx + r * Math.cos(a), y: radarCy + r * Math.sin(a) };
  };
  const lbl = (i) => {
    const a = (Math.PI * 2 * i) / numTopics - Math.PI / 2;
    const r = maxR + 28;
    return { x: radarCx + r * Math.cos(a), y: radarCy + r * Math.sin(a) };
  };

  const poly = topics.map((t, i) => {
    const p = pt(i, normalized[t] || 0);
    return `${p.x},${p.y}`;
  }).join(' ');

  const gridLevels = [25, 50, 75, 100];
  const gridPolys = gridLevels.map(level => {
    const pts = topics.map((_, i) => {
      const p = pt(i, level);
      return `${p.x},${p.y}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />`;
  }).join('');

  const axes = topics.map((_, i) => {
    const p = pt(i, 100);
    return `<line x1="${radarCx}" y1="${radarCy}" x2="${p.x}" y2="${p.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
  }).join('');

  const labels = topics.map((topic, i) => {
    const v = normalized[topic] || 0;
    const p = pt(i, v);
    const l = lbl(i);
    const color = v >= 70 ? '#22c55e' : v >= 40 ? '#eab308' : v > 0 ? '#ef4444' : '#4b5563';
    const anch = l.x < radarCx - 15 ? 'end' : l.x > radarCx + 15 ? 'start' : 'middle';
    const meta = DEFAULT_META[topic] || { short: topic.slice(0, 8).toUpperCase() };
    return `
      <circle cx="${p.x}" cy="${p.y}" r="${v > 0 ? 5 : 3}" fill="${color}" stroke="white" stroke-width="1.5" />
      <text x="${l.x}" y="${l.y - 4}" text-anchor="${anch}" fill="#9ca3af" font-size="14" font-weight="600" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${meta.short}</text>
      <text x="${l.x}" y="${l.y + 14}" text-anchor="${anch}" fill="${color}" font-size="15" font-weight="700" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${v > 0 ? v + '%' : '—'}</text>
    `;
  }).join('');

  const textX = 580;
  const subtitle = handle ? `${handle}` : 'my SQL shape';
  // Scale archetype font so long names ('The Full-Stack Analyst') fit.
  const nameLen = (archetype.emoji?.length || 0) + 1 + (archetype.name?.length || 0);
  const archetypeFontSize = nameLen <= 14 ? 62 : nameLen <= 18 ? 54 : nameLen <= 22 ? 46 : 40;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a1a2e" />
      <stop offset="50%" stop-color="#2d1b4e" />
      <stop offset="100%" stop-color="#1a1a2e" />
    </linearGradient>
    <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(147,51,234,0.45)" />
      <stop offset="100%" stop-color="rgba(236,72,153,0.45)" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)" />

  <!-- Radar grid -->
  ${gridPolys}
  ${axes}
  <polygon points="${poly}" fill="url(#radarFill)" stroke="rgba(168,85,247,0.9)" stroke-width="3" filter="url(#glow)" />
  ${labels}

  <!-- Right-side text block -->
  <text x="${textX}" y="170" fill="#FFE34D" font-size="20" font-weight="700" font-family="system-ui,-apple-system,Segoe UI,sans-serif" letter-spacing="2">SQL QUEST</text>
  <text x="${textX}" y="260" fill="#ffffff" font-size="${archetypeFontSize}" font-weight="900" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${archetype.emoji} ${escapeXml(archetype.name)}</text>
  <text x="${textX}" y="310" fill="#d1d5db" font-size="22" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${escapeXml(archetype.tagline)}</text>

  <rect x="${textX}" y="380" width="240" height="90" rx="12" fill="rgba(255,227,77,0.12)" stroke="#FFE34D" stroke-width="2" />
  <text x="${textX + 20}" y="415" fill="#FFE34D" font-size="14" font-weight="600" font-family="system-ui,-apple-system,Segoe UI,sans-serif" letter-spacing="1">OVERALL</text>
  <text x="${textX + 20}" y="458" fill="#ffffff" font-size="42" font-weight="900" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${overall}<tspan font-size="24" fill="#9ca3af">/100</tspan></text>

  <text x="${textX}" y="560" fill="#9ca3af" font-size="22" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${escapeXml(subtitle)}</text>
  <text x="${textX}" y="595" fill="#a855f7" font-size="22" font-weight="700" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${escapeXml(brandUrl)}</text>
</svg>`;
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Render the SVG to a PNG Blob at the specified dimensions.
 * Returns a Promise<Blob>.
 */
export function renderRadarPng(skills, opts = {}) {
  const { width = 1200, height = 630 } = opts;
  const svg = buildRadarShareSvg(skills, opts);
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Trigger a download of the radar PNG.
 * @param {Object} skills
 * @param {Object} [opts] — passes through to renderRadarPng. Adds `filename`.
 */
export async function downloadRadarPng(skills, opts = {}) {
  const { filename = 'sql-quest-radar.png' } = opts;
  const blob = await renderRadarPng(skills, opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy the radar PNG to the clipboard. Falls back to download on platforms
 * without clipboard image support (Firefox, older Safari).
 * Returns 'clipboard' | 'download' depending on what happened.
 */
export async function copyOrDownloadRadarPng(skills, opts = {}) {
  try {
    const blob = await renderRadarPng(skills, opts);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob }),
      ]);
      return 'clipboard';
    }
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = opts.filename || 'sql-quest-radar.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'download';
  } catch (err) {
    // Last-ditch: just download
    try {
      await downloadRadarPng(skills, opts);
      return 'download';
    } catch (_) {
      throw err;
    }
  }
}

/**
 * Build a pre-filled share URL for a platform. None of these platforms accept
 * image uploads via URL — they take text. Users will paste the PNG they copied
 * via copyOrDownloadRadarPng() into the composer.
 */
export function buildShareUrl(platform, { skills, handle, brandUrl = 'sqlquest.io' } = {}) {
  const normalized = normalizeSkills(skills || {});
  const archetype = deriveArchetype(normalized);
  const vals = Object.values(normalized).filter(v => typeof v === 'number');
  const overall = vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;

  const text = `I'm ${archetype.name} ${archetype.emoji} on SQL Quest — overall ${overall}/100.\nWhat's your SQL shape?`;
  const url = `https://${brandUrl}`;

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    default:
      return url;
  }
}
