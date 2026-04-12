# SQL Quest — Claude Instructions

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border-radius, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

Enforcement:
- Never introduce a new color outside the `DESIGN.md` palette.
- Never use Inter, Roboto, Poppins, Montserrat, or any blacklisted font.
- The accent color (`#FFE34D`) appears ONLY on primary CTAs, score/XP values, leaderboard medal ranks, streak indicators, and win-state flashes. Never on borders, backgrounds, icons, or decoration.
- The SQL syntax palette (blue keyword / green string / orange number) is brand, not a generic IDE theme.
- In QA or review mode, flag any code that doesn't match `DESIGN.md`.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
