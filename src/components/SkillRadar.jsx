import React from 'react';

/**
 * SkillRadar — pure SVG radar primitive.
 *
 * Single source of truth for rendering the skill-radar shape anywhere in the
 * app: Coach tab, dashboard hero, post-solve pop, OG image, public profile,
 * header mini, landing page tease. Props in, SVG out. No app state, no
 * side-effects, no hooks.
 *
 * @param {Object} props
 * @param {Object} props.skills             Map of skill name → 0-100.
 * @param {number} [props.size=340]         Square size in px.
 * @param {string[]} [props.canonicalSkills] Skills to render, in order. Defaults
 *                                          to the current 10-skill taxonomy.
 *                                          Pass the 9-skill set once the
 *                                          reshuffle ships.
 * @param {Object} [props.meta]             Per-skill { short, icon } map.
 *                                          Defaults provided for current
 *                                          taxonomy.
 * @param {boolean} [props.showScores=true] Render the per-axis percentage.
 * @param {boolean} [props.showLabels=true] Render axis labels.
 * @param {boolean} [props.showGrid=true]   Render grid polygons.
 * @param {Object} [props.highlightDeltas]  Map of skill → positive number.
 *                                          Those axes flash yellow (#FFE34D).
 *                                          Used by post-solve pop.
 * @param {'purple'|'accent'} [props.theme='purple'] Fill color family.
 * @param {string} [props.className]        Wrapper className passthrough.
 * @param {string} [props.ariaLabel]        Accessibility label.
 */
export default function SkillRadar({
  skills = {},
  size = 340,
  canonicalSkills = DEFAULT_SKILLS,
  meta = DEFAULT_META,
  showScores = true,
  showLabels = true,
  showGrid = true,
  highlightDeltas = null,
  theme = 'purple',
  className = '',
  ariaLabel = 'SQL skill radar',
}) {
  const normalized = normalizeSkills(skills);
  const topics = canonicalSkills;
  const numTopics = topics.length;
  const cx = size / 2;
  const cy = size / 2;
  const labelPad = showLabels ? 50 : 12;
  const maxR = size / 2 - labelPad;

  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / numTopics - Math.PI / 2;
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const lbl = (i) => {
    const a = (Math.PI * 2 * i) / numTopics - Math.PI / 2;
    const r = maxR + 32;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const poly = topics.map((t, i) => {
    const p = pt(i, normalized[t] || 0);
    return `${p.x},${p.y}`;
  }).join(' ');

  const gridLevels = [25, 50, 75, 100];
  const fillId = `radarFill-${theme}`;
  const glowId = `radarGlow-${theme}`;
  const strokeColor = theme === 'accent' ? 'rgba(255,227,77,0.9)' : 'rgba(168,85,247,0.9)';
  const gradStart = theme === 'accent' ? 'rgba(255,227,77,0.35)' : 'rgba(147,51,234,0.4)';
  const gradEnd = theme === 'accent' ? 'rgba(255,183,77,0.3)' : 'rgba(236,72,153,0.4)';

  const getColor = (v) => v >= 70 ? '#22c55e' : v >= 40 ? '#eab308' : v > 0 ? '#ef4444' : '#374151';

  return (
    <svg
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      className={className}
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${size} ${size}`}
    >
      <defs>
        <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradStart} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {showGrid && gridLevels.map(level => {
        const pts = topics.map((_, i) => {
          const p = pt(i, level);
          return `${p.x},${p.y}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={pts}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {showGrid && showLabels && gridLevels.map(level => {
        const p = pt(0, level);
        return (
          <text
            key={`g${level}`}
            x={p.x + 3}
            y={p.y - 3}
            fontSize="8"
            fill="rgba(255,255,255,0.15)"
          >{level}</text>
        );
      })}

      {topics.map((_, i) => {
        const p = pt(i, 100);
        return (
          <line
            key={`ax${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        );
      })}

      <polygon
        points={poly}
        fill={`url(#${fillId})`}
        stroke={strokeColor}
        strokeWidth="2"
        filter={`url(#${glowId})`}
      />

      {topics.map((topic, i) => {
        const v = normalized[topic] || 0;
        const p = pt(i, v);
        const l = lbl(i);
        const c = getColor(v);
        const delta = highlightDeltas && highlightDeltas[topic] > 0 ? highlightDeltas[topic] : 0;
        const isHighlighted = delta > 0;
        const anch = l.x < cx - 15 ? 'end' : l.x > cx + 15 ? 'start' : 'middle';
        const m = meta[topic] || { short: topic.slice(0, 8).toUpperCase(), icon: '•' };

        return (
          <g key={topic}>
            {isHighlighted && (
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                fill="none"
                stroke="#FFE34D"
                strokeWidth="2"
                opacity="0.9"
              >
                <animate attributeName="r" from="4" to="14" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.9" to="0" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={v > 0 ? 4 : 2.5}
              fill={isHighlighted ? '#FFE34D' : c}
              stroke="white"
              strokeWidth={v > 0 ? 1.5 : 0.5}
            />
            {showLabels && (
              <text
                x={l.x}
                y={l.y - 5}
                textAnchor={anch}
                fontSize="9"
                fill={isHighlighted ? '#FFE34D' : '#9ca3af'}
                fontWeight="600"
              >{m.short}</text>
            )}
            {showScores && (
              <text
                x={l.x}
                y={l.y + 8}
                textAnchor={anch}
                fontSize="10"
                fontWeight="bold"
                fill={isHighlighted ? '#FFE34D' : c}
              >
                {v > 0 ? `${v}%` : '—'}
                {isHighlighted ? ` +${delta}` : ''}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Defaults ─────────────────────────────────────────────────────────────
// Keep in sync with CANONICAL_SKILLS in src/utils/skill-calc.js. When the
// 9-skill taxonomy ships, callers pass their own canonicalSkills + meta and
// these defaults update too.

export const DEFAULT_SKILLS = [
  'SELECT Basics',
  'Filter & Sort',
  'Aggregation',
  'GROUP BY',
  'JOIN Tables',
  'Subqueries',
  'String Functions',
  'Date Functions',
  'CASE Statements',
  'Window Functions',
];

export const DEFAULT_META = {
  'SELECT Basics':    { short: 'SELECT', icon: '📋', desc: 'Retrieving data from tables' },
  'Filter & Sort':    { short: 'WHERE',  icon: '🔍', desc: 'Filtering & ordering results' },
  'Aggregation':      { short: 'AGG',    icon: '📊', desc: 'COUNT, SUM, AVG, MIN, MAX' },
  'GROUP BY':         { short: 'GROUP',  icon: '📁', desc: 'Grouping & HAVING clauses' },
  'JOIN Tables':      { short: 'JOIN',   icon: '🔗', desc: 'Combining multiple tables' },
  'Subqueries':       { short: 'SUBQ',   icon: '🎯', desc: 'Nested queries & CTEs' },
  'String Functions': { short: 'STRING', icon: '✂️', desc: 'Text manipulation' },
  'Date Functions':   { short: 'DATE',   icon: '📅', desc: 'Date/time operations' },
  'CASE Statements':  { short: 'CASE',   icon: '🔀', desc: 'Conditional logic' },
  'Window Functions': { short: 'WINDOW', icon: '🪟', desc: 'ROW_NUMBER, RANK, etc.' },
};

// Legacy key aliasing. Historic saves used shorter keys, normalize on read.
const KEY_NORM = {
  'Aggregates': 'Aggregation',
  'AGG': 'Aggregation',
  'JOINs': 'JOIN Tables',
  'JOIN': 'JOIN Tables',
  'WHERE/ORDER': 'Filter & Sort',
  'WHERE': 'Filter & Sort',
  'Strings': 'String Functions',
  'STRING': 'String Functions',
  'Dates': 'Date Functions',
  'DATE': 'Date Functions',
  'CASE': 'CASE Statements',
  'Windows': 'Window Functions',
  'WINDOW': 'Window Functions',
  'SELECT': 'SELECT Basics',
  'GROUP': 'GROUP BY',
  'SUBQ': 'Subqueries',
};

export function normalizeSkills(raw) {
  const out = {};
  Object.entries(raw || {}).forEach(([k, v]) => {
    out[KEY_NORM[k] || k] = v;
  });
  return out;
}

// ── Archetype derivation (Phase 6 hook, exported early so shared types) ──
// Returns { name, emoji, tagline } based on radar shape.

export function deriveArchetype(skills) {
  const s = normalizeSkills(skills || {});
  const get = (k) => s[k] || 0;
  const vals = Object.values(s).filter(v => typeof v === 'number');
  const max = vals.length ? Math.max(...vals) : 0;
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

  // No data
  if (max === 0) {
    return { name: 'The Explorer', emoji: '🧭', tagline: 'Fresh start. Your shape begins with your next solve.' };
  }

  // Specialists (≥70 in a domain)
  if (get('Window Functions') >= 70) {
    return { name: 'The Window Wizard', emoji: '🪟', tagline: 'ROW_NUMBER, RANK, LAG — you see the patterns others miss.' };
  }
  if (get('JOIN Tables') >= 70 && get('Subqueries') >= 60) {
    return { name: 'The Join Master', emoji: '🔗', tagline: 'You weave tables together like it\'s breathing.' };
  }
  if (get('Aggregation') >= 70 && get('GROUP BY') >= 65) {
    return { name: 'The Aggregation Ace', emoji: '📊', tagline: 'COUNT, SUM, GROUP — the numbers bend to you.' };
  }
  if (get('CASE Statements') >= 70 && get('Subqueries') >= 60) {
    return { name: 'The Logic Surgeon', emoji: '🔀', tagline: 'Conditional logic, nested precision. Every edge case accounted for.' };
  }
  if (get('Date Functions') >= 70 || get('String Functions') >= 70) {
    return { name: 'The Data Wrangler', emoji: '✂️', tagline: 'Strings and dates are putty in your hands.' };
  }

  // Generalists
  if (avg >= 65) {
    return { name: 'The Full-Stack Analyst', emoji: '🎯', tagline: 'Strong across the board. No weak spots.' };
  }
  if (avg >= 50) {
    return { name: 'The Journey-Person', emoji: '🚶', tagline: 'Broad footing, leveling up every skill.' };
  }
  if (avg >= 30) {
    return { name: 'The Apprentice', emoji: '📚', tagline: 'The basics are locking in. Momentum building.' };
  }
  return { name: 'The Explorer', emoji: '🧭', tagline: 'Mapping the territory. Every solve sharpens the shape.' };
}
