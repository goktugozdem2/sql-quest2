# Design System — SQL Quest

## Product Context
- **What this is:** A gamified SQL learning platform with four modes (Blitz, Practice, Daily Query, Gauntlet). The query is the hero.
- **Who it's for:** Broad consumer — complete beginners, students, and working devs/analysts brushing up or prepping for interviews.
- **Space/industry:** Online learning / dev education. Peers: Duolingo, Mimo, SoloLearn, DataCamp, HackerRank, SQLZoo, SQL Noir.
- **Project type:** Web app (React + Tailwind, static build).

## Aesthetic Direction
- **Direction:** Editorial-Arcade hybrid. Dense, crafted, taste-forward, with one unapologetic burst of arcade color for wins/XP/CTAs.
- **Decoration level:** Intentional. Subtle grain on dark surfaces, hairline 1px dividers, visible-but-quiet grid. No blobs, no button gradients, no 3-icon feature grids, no mascots.
- **Mood:** A beautifully typeset arcade. Serious about craft, playful about progress. Linear's restraint + Pitchfork's typographic confidence + a single neon win-state that punches.
- **Differentiation:** The category splits between clean-modern-mint (Duolingo/Mimo/DataCamp, all interchangeable) and heavy-theme (SQL Noir, SQLPD). Nobody owns "crafted adult playful." That's the gap.

## Typography
- **Display/Hero:** **Fraunces** (variable serif, italic 800 for mode headers and hero). "BLITZ." in big Fraunces italic is the signature.
- **Body/UI:** **Geist Sans** (300/400/500/600). Tabular-nums on. Not Inter.
- **Query/Code (hero font):** **JetBrains Mono** (400/500/700). Berkeley Mono is the paid upgrade path if licensed.
- **Numbers (score/timer/XP):** **Geist Mono** with `font-variant-numeric: tabular-nums` — no layout shift as digits tick.
- **Loading:** Google Fonts via `<link preconnect>`:
  `https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,600;1,9..144,800&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap`
- **Scale (rem, 16px base):**
  - xs 12 / sm 14 / base 15 / md 17 / lg 20 / xl 28 / 2xl 36 / 3xl 56 / hero clamp(56px, 10vw, 128px)
- **Blacklist:** Inter, Roboto, Poppins, Montserrat, Arial, Helvetica. No cartoon/display fonts.

## Color
- **Approach:** Restrained. One accent only. Dark mode primary; light mode exists.
- **Dark palette (primary):**
  ```
  --bg         #0E0F13   near-black, slight cool
  --surface    #16181F   raised card
  --surface-2  #1F222B   elevated
  --border     #2A2E38
  --text       #F2F0EA   warm off-white, NOT pure white
  --text-muted #8A8E99
  --accent     #FFE34D   arcade yellow — the only accent
  --accent-ink #0E0F13   text on accent
  ```
- **SQL syntax (part of the brand palette, not a generic IDE theme):**
  ```
  --sql-keyword #7CC4FF   cool blue — SELECT/FROM/WHERE/JOIN/GROUP BY
  --sql-string  #B5E48C   muted green — string literals
  --sql-number  #FFB86C   warm orange — numeric literals
  --sql-comment #8A8E99   italic — comments
  ```
- **Semantic:**
  ```
  --success #4ADE80
  --error   #FF6B6B
  --warning #FFB020
  --info    #7CC4FF
  ```
- **Light mode:**
  ```
  --bg         #F6F4EE   warm paper
  --surface    #FFFFFF
  --surface-2  #EFEDE5
  --border     #E0DCD0
  --text       #15171C
  --text-muted #6B6E78
  --accent     #F5C518   slightly deeper yellow for contrast
  --sql-keyword #0B5FB8
  --sql-string  #3F7A2E
  ```
- **Accent rule:** Yellow appears ONLY on: primary CTAs, score/XP values, leaderboard medal ranks, streak indicators, win-state flashes. Never on borders, backgrounds, icons, or decoration. Scarcity is the point.

## Spacing
- **Base unit:** 4px.
- **Density:** Comfortable. Not Linear-compact, not Mimo-airy.
- **Scale:** `2xs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48 · 4xl 72`

## Layout
- **Approach:** Hybrid. Grid-disciplined for query/practice surfaces (monospace alignment matters). Editorial/asymmetric for mode select, marketing, dashboards.
- **Max content width:** 1120px.
- **Grid:** 12-col desktop, 6-col tablet, 4-col mobile. 24px gutters.
- **Border radius:** Restrained, hierarchical. `sm 4 · md 6 · lg 10 · pill 9999`. No uniform 16px bubbles.
- **Dividers:** 1px, `--border` color. Hairlines, not heavy rules.

## Motion
- **Approach:** Intentional. Quiet everywhere, expressive only on win states.
- **Easing:** enter `ease-out` · exit `ease-in` · move `ease-in-out`
- **Duration:** micro 80ms · short 150ms · medium 250ms · long 400ms
- **Win states:** score pop, streak flame, XP gain — these get 400ms choreography with a subtle overshoot. Everything else is 150ms or less.
- **Reduced motion:** honor `prefers-reduced-motion` — collapse all win-state choreography to opacity fades.

## Deliberate Risks (do not water these down without re-review)
1. **Fraunces italic serif for display.** Category uses sans. Commit to no mascot — it would fight the serif.
2. **One accent color only (yellow).** Duolingo uses a rainbow. You get scarcity; every win feels earned.
3. **SQL syntax colors are brand colors.** The blue/green/orange in the query editor is a product signature, not a reusable generic IDE theme.

## Decisions Log
| Date       | Decision                                | Rationale |
|------------|-----------------------------------------|-----------|
| 2026-04-08 | Initial design system created           | /design-consultation — research-backed proposal (gap between Duolingo-clone and niche-theme category). Broad-consumer audience. User approved preview page directly. |
