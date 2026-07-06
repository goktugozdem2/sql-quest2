# Datrick — company website

Static site for datrick.com. Plain HTML + one shared stylesheet, no build step,
no framework. Ready to deploy on Vercel and swap in as the production site.

## Pages

| URL | File |
| --- | --- |
| `/` | `index.html` |
| `/etl` | `etl.html` |
| `/dwh` | `dwh.html` |
| `/devops-engineers` | `devops-engineers.html` |
| `/team` | `team.html` |
| `/blog` | `blog.html` |
| `/career` | `career.html` |
| `/schedule` | `schedule.html` |
| `/terms-of-use` | `terms-of-use.html` |

Clean URLs come from `cleanUrls: true` in `vercel.json` — Vercel serves
`etl.html` at `/etl` automatically. A custom `404.html`, `robots.txt`, and
`sitemap.xml` are included. Old paths from the previous site
(`/etlelt-pricing-guide`, `/etl-development-services`, `/etl-and-big-data-technologies`)
redirect to `/etl` — adjust in `vercel.json` as you add real pages back.

## Deploy to Vercel

### Option A — new Vercel project from this repo (recommended)

1. In Vercel: **Add New → Project**, import this GitHub repo
   (`goktugozdem2/sql-quest2`), branch `claude/datrick-website-clone-cxx4up`
   (or `main` after merging).
2. Set **Root Directory** to `datrick-site`.
3. Framework Preset: **Other**. Leave Build Command and Output Directory
   **empty** (it's a static site — Vercel serves the directory as-is).
4. Deploy, then in **Settings → Domains** add `datrick.com` and
   `www.datrick.com`. Vercel walks you through moving the DNS records;
   once the domain is reassigned from your old project/host, this site
   replaces the old one with zero downtime.

### Option B — CLI

```sh
cd datrick-site
npx vercel --prod
```

Then attach the domain: `npx vercel domains add datrick.com` (or via the dashboard).

## Local preview

Root-relative URLs (`/etl`, `/assets/styles.css`) need a server — opening the
files directly with `file://` won't resolve links:

```sh
cd datrick-site
npx serve .   # http://localhost:3000
```

## Before going live

- [ ] Replace the placeholder block in `schedule.html` with your real
      scheduling embed (Calendly / Cal.com / SavvyCal) — it's marked with a comment.
- [ ] Blog cards in `blog.html` link to `#` — point them at real posts or hide the page.
- [ ] `terms-of-use.html` is placeholder legal text — have counsel review.
- [ ] Add a real favicon / og-image if you want link unfurls.
