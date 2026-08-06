# Autonomous agent

Runs SQL Quest work unattended on a schedule and opens pull requests. It never
pushes to `main` and never merges.

## Why it is shaped like this

An agent editing a live product without review is how you get the next
incident, and this repo's `CLAUDE.md` is a list of incidents caused by
unreviewed assumptions. So the autonomy is real but bounded: the agent may
propose, and only a human may land.

Four gates, each independent of the others:

| # | Gate | Blocks |
|---|---|---|
| 1 | `guard.sh` | protected paths, money/auth symbols, runaway diffs, leaked credentials |
| 2 | `npm run build:check` | lint + 686 tests + build + artifact validation |
| 3 | GitHub Actions on the PR | the same checks again, from a clean checkout |
| 4 | you | the merge button |

Gate 1 exists because gate 2 does not know the difference between a content
edit and a pricing edit. Gate 3 exists because gate 2 runs in the agent's own
dirty environment. Gate 4 exists because the other three are code.

## What it may and may not touch

Hard-blocked by `guard.sh`:

- `supabase/functions/` — deploying these sends real email and touches Stripe
- `supabase/migrations/` — schema changes are one-way doors
- `.github/workflows/` — the agent must not weaken its own CI gate
- `scripts/agent/` — the agent must not edit its own guardrails
- `vercel.json`, `package.json`, `package-lock.json`

Also blocked, by content rather than path, because the monolith holds the
pricing modal and the checkout handler in the same file as everything else:
any diff line containing `buy.stripe.com`, `beginCheckout`,
`pro_purchase_completed`, `stripe_webhook`, `proStatus`, or an API-key name.

Caps: 25 files, 400 lines. Above that the run aborts — a diff that size is a
prompt that went sideways, not a contribution.

## Tasks

| Task | Schedule | What it does | Risk |
|---|---|---|---|
| `weekly-read` | Mon 08:00 | Reads the funnel and writes `docs/reads/YYYY-MM-DD-weekly.md`. Touches nothing but that directory. | low |
| `content-fix` | Wed 08:00 | Finds the worst challenge by live solve-through, rewrites its description EN+TR, or changes nothing if it finds no concrete defect. | medium |

A run that proposes nothing is a successful run. Both prompts say so
explicitly, because an agent that must produce something will lower its own bar
to have something to produce.

Add a task by dropping `tasks/<name>.md` in and adding a timer in
`install-vps.sh`.

## Backlog guard

If 3 agent PRs are already open, the next run exits without doing anything.
An agent that opens PRs faster than a human merges them is generating work,
not doing it.

## What is deliberately NOT automated

One-off changes. Mobile layout fixes, packaging changes, pricing, the paywall,
email sends, schema migrations. None of those are recurring work — you do them
once, with review — and several of them are one-way doors.

## Install

On the VPS, as the user that will own the agent — not root.

**Run 1** writes `~/sqlquest-agent/.env` and stops:

```bash
curl -fsSL https://raw.githubusercontent.com/goktugozdem2/sql-quest2/main/scripts/agent/install-vps.sh | bash
```

Fill in the two values it asks for:

- `ANTHROPIC_API_KEY` — console.anthropic.com → API keys
- `GH_TOKEN` — github.com/settings/tokens → **fine-grained**, this repo only,
  Contents read+write, Pull requests read+write

**Run 2** clones, installs the timers, and starts them:

```bash
bash ~/sqlquest-agent/repo/scripts/agent/install-vps.sh
sudo loginctl enable-linger "$USER"    # so timers fire while logged out
```

One credential, not two: git authenticates over HTTPS with the same `GH_TOKEN`
that `gh pr create` needs, so there is no deploy key and no SSH key to manage.
The token goes into the credential helper rather than the remote URL — a URL
with a token in it leaks into `git remote -v`, into logs, and into every error
message.

Never put a password into a prompt, a commit, a chat window, or a script. If
one ever ends up somewhere it shouldn't, rotate it rather than deleting the
message; the copy you can see is not the only one.

## Operating it

```bash
systemctl --user list-timers | grep sqlquest     # when it next runs
bash scripts/agent/run.sh weekly-read            # run one now
tail -f ~/sqlquest-agent/logs/*.log              # watch
systemctl --user disable --now sqlquest-content-fix.timer   # stop one
```

Every run writes `~/sqlquest-agent/logs/<task>-<stamp>.log`, and the PR body
links to it.
