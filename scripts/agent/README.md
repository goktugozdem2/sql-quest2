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

## Auth: subscription or API key

Either works. Set one in `~/sqlquest-agent/.env`.

**Subscription** (recommended here — flat cost, and this fleet is small):

```bash
claude setup-token       # on any machine where you're logged in
# paste into CLAUDE_CODE_OAUTH_TOKEN
```

**API key**: `ANTHROPIC_API_KEY` from console.anthropic.com. Isolated quota,
billed per token.

### The catch, and what the code does about it

A subscription draws from **the same quota as your own interactive sessions**.
An unattended fleet running all day will leave you rate-limited at your own
keyboard — the background system starving the foreground human, which is
exactly backwards. Four defences, all on by default in subscription mode:

| Setting | Default | Why |
|---|---|---|
| `AGENT_QUIET_HOURS` | `2-6` | Runs only 02:00–06:00 local. Burns quota while you sleep. `AGENT_FORCE=1` overrides for a manual run. |
| `AGENT_MAX_RUNS_PER_DAY` | `4` | Hard stop regardless of how many timers fire. |
| `AGENT_MAX_OPEN_PRS` | `1` | The reviewer is the bottleneck, not the writer. |
| `AGENT_MODEL` | unset | Point cheap tasks at a cheaper model; leave `content-fix` on the strong one. |

And it **fails closed**: if a run hits a usage limit, it parks the fleet for the
rest of the day instead of retrying. A retry storm does not just exhaust today's
window, it eats tomorrow's.

Timers are scheduled at 03:00 and 03:30 so the PR is waiting when you sit down
and the quota is not already gone.

If you later move to API-key mode, quiet hours stop applying automatically —
there is no shared quota to protect.

**Check Anthropic's current terms for unattended/automated use on your plan
before pointing a large fleet at a subscription.** The mechanics work; whether
your plan permits the volume you want is a separate question, and it changes.

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
