# Lane state files

One file per lane, so a lane can resume in either runtime (cloud or laptop)
without the laptop's local run log. Each file holds the last run, the next
step and open threads, and **never customer data** (no usernames, emails or
quotes). The lane updates its own file at the end of each run, in the same
PR as its output. Plan: docs/plans/fleet-hardening-2026-11-22.md, "Later".
