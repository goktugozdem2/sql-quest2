# SQLQuest Work Plan

## Context
SQLQuest is a browser-based SQL interview prep platform. Pro pricing: $29/month,
$99/year. The main business bottleneck is conversion from the Pro modal to
completed checkout. Fix conversion before driving more traffic.

Bing organic traffic roughly equals Google's and ranks us top 10 for generic terms
like "sql practice questions", "sql practice exercises", "sql exercises". Google
traffic comes mostly from company and trap pages.

## Rules for every session
- Read CLAUDE.md and this file first.
- One task per session, one branch, one PR.
- Never use live payment keys or production database credentials. Test mode only.
- Explain every change in the PR description.

## Phase 1: Conversion
1. Funnel tracking. Instrument modal open, plan selected, checkout started,
   completed, abandoned. Use existing analytics. Document events in docs/funnel.md.
2. Modal and checkout. Find and fix friction: clicks, pricing clarity, trust
   signals, load speed, mobile. Ship behind a feature flag.
3. Paywall moments. Every point where a free user hits a Pro feature must show
   clear value and a direct upgrade path.

## Phase 2: SEO
4. Technical SEO. Meta tags, canonicals, sitemap, structured data for challenges,
   internal linking, Core Web Vitals.
5. Bing landing pages. Target "sql practice questions", "sql practice exercises",
   "sql exercises". Link to existing challenges.

## Phase 3: Infrastructure
6. Bing Webmaster pipeline. Ingest into the GSC table with an `engine` column
   ('google' or 'bing'). Backfill existing rows. Tests and dry-run mode.
7. Test coverage. Auth, payment webhooks, challenge evaluation, AI tutor calls.
   Tests only, no behavior changes.
