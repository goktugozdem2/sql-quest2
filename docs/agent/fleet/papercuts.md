# Fleet papercuts — the snags agents hit

A papercut is a one-line snag a run hit that was not the task itself: tooling,
data, or a brief that was ambiguous or silent. Agents report them in the
`papercuts` field of their FLEET-RESULT line (README, common protocol, step 8);
the orchestrator (laptop lanes) or the lane's PR (cloud lanes) copies each new
one here and into the run ledger. D3 reads the open rows every Monday and
answers each with a versioned brief edit or a tooling fix (README, "The skills
loop").

Rules:
- One row per papercut, newest at the bottom. No customer data: no usernames,
  emails, aids beyond an 8-character prefix of an internal test aid.
- `status` starts with `open` or `fixed`. A fixed row names the PR or the
  script that fixed it. Never delete a row; `fixed` is the history.
- `owner` is who reviews the fix: `orchestrator` (laptop lanes and the
  orchestrator's own scripts), `cloud-A0` (cloud lanes, A1 reviews), `founder`
  (money or outward rules).

| date | lane | papercut | proposed fix | owner | status |
|---|---|---|---|---|---|
| 2026-11-25 | orchestrator | The shared `node_modules` symlinked from `w-fastcheckout` went stale (missing `html-validate`, `resvg`), so builds failed in worktrees for reasons unrelated to the change. | Per-worktree `npm ci` instead of a shared symlink. | orchestrator | fixed — orchestrator's worktree scripts |
| 2026-11-25 | orchestrator | Re-merging `main` into a branch took main's `public/sitemap.xml` and dropped the branch's new rows. | A 3-way sitemap union on remerge. | orchestrator | fixed — orchestrator's remerge script |
| 2026-11-25 | fleet | `orchestrator-decisions.md` and `metrics.md` are append-only and conflict on nearly every PR that adds a row. | One file per decision row / metric, or `.gitattributes` `merge=union` for append-only files. | orchestrator | open |
| 2026-11-25 | E1 | `pro_events` has no `aid` column, but the docs said `coalesce(aid, username)`; run as written the query errors. | Say it is shorthand for the metadata expression. | orchestrator | fixed — #368 |
| 2026-11-25 | A2 | The smoke and walk tooling does not block Microsoft Clarity, so local walks are recorded as sessions. | Block the Clarity host in the headless profiles (`scripts/smoke/lib.mjs`). | orchestrator | open |
| 2026-11-25 | A2 | Walk and test aids pollute production reads (the `363dfb2b…` walk aid, the A2 walk aids); each read drops them by hand. | A test-traffic stamp (`metadata.test = true`, set by a query flag the walks use) and a shared filter. | orchestrator | open |
| 2026-11-25 | C8 | Google's non-search fetchers (GoogleOther, Google-NotebookLM) were counted as human landings. | Stamp them on landing rows (`google_other`, `notebooklm`). | orchestrator | fixed — #392, awaiting merge |
| 2026-11-25 | C8 | The `app1lang` crawler opens the Pro modal and inflates `pro_modal_shown`. | Stamp it at source like the other crawlers, and exclude it in the modal reads. | orchestrator | open |
| 2026-11-25 | builder (Health Check) | The Health Check PR shipped a funnel-step change without a flag; A1 sent it back (REVISE) twice. The code lanes' briefs never said "funnel-step change ⇒ dark flag". | Put the rule in every code lane's brief. | orchestrator | fixed — #396 (code-lane hard rules; `tests/fleet-skills.test.js` pins them) |
| 2026-11-25 | orchestrator | An agent's worktree restore copied an unrelated scratch file (`track.bak`) into the change. | Unique backup names (`<file>.<lane>.<timestamp>.bak`) outside the worktree. | orchestrator | open |
