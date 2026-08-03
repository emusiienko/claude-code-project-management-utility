---
status: Done
assignee: devops
story: STORY-024
---

# TASK-002: Document two-stack workflow and verify data isolation

## What to implement
Document the concurrent dual-stack workflow and resolve the Postgres open question, then verify
data isolation explicitly rather than assuming it from Compose's folder-based project naming.

Add a dedicated section to the DevOps strategy covering: how to stand up a second concurrent
instance from a separate checkout, exactly which environment values must differ between the two
stacks (and why the browser-coupling values must track the ports), the decision to run a separate
Postgres container per stack (not a shared server), and a concrete runtime procedure to verify each
stack's data (SQLite file / Postgres volume / attachments volume) stays isolated. Refresh the
project overview infrastructure notes and the README deployment/resources section to point at the
new capability.

## Scope
- `docs/devops-strategy.md` (new dual-deployment section + Postgres decision + verification procedure)
- `CLAUDE.md` § Infrastructure (env-configurable ports / stack name)
- `README.md` (deployment + resources: configurable ports, pointer to two-stack docs)

## Dependencies
TASK-001

## Acceptance Criteria
- [ ] DevOps strategy documents the two-stack workflow and the exact `.env` deltas for a second stack.
- [ ] The Postgres shared-server-vs-separate-container question is decided and documented.
- [ ] A runtime data-isolation verification procedure is documented (create data in one stack,
      confirm absent in the other).
- [ ] `CLAUDE.md` § Infrastructure and `README.md` reflect the configurable ports and two-stack workflow.

## Intended ADR
Separate Postgres container per stack (confirm at Reconcile).

---
## Implementation Report
**Date**: 2026-08-01

**What was done**:
- `docs/devops-strategy.md`: added a "Running Two Stacks Concurrently (dual local deployment)"
  section — the mechanism (folder-based project naming for containers/volumes/networks; env vars for
  the two things Compose doesn't namespace: host ports + image tags), the step-by-step second-stack
  workflow, the exact five `.env` deltas (`STACK_NAME` + 3 ports + the two browser-coupling URLs) and
  why the coupling URLs must track the ports, the fail-fast behavior on forgotten overrides, the
  PostgreSQL decision (separate container per stack, with the rejection rationale for a shared
  server), and a two-level isolation verification (config-level done; runtime data-isolation
  user-run procedure). Also refreshed the Configuration section's ports bullet.
- `CLAUDE.md` § Infrastructure: added a concurrent-stacks paragraph to the overview and the new vars
  to the Config bullet.
- `README.md`: added a "Running two stacks concurrently" subsection and a note that the Resources
  table ports are defaults.

**Verification**: config-level isolation proven in TASK-001 (`docker compose config` for both a
default and a second-stack env — distinct host ports, distinct image tags, fixed container ports).
The end-to-end runtime data-isolation test (create data in stack A, confirm absent in stack B) is
documented as a one-time user-run procedure — it needs two full `./deploy.sh up` runs, which per
convention the user executes locally, not the agent.

**Deviations from plan**: None.

**Technical decisions made**:
- **Separate PostgreSQL container per stack** rather than a shared server with distinct database
  names: keeps each stack self-contained (matching the SQLite default), avoids coupling the two
  stacks' lifecycles, and needs only a distinct `POSTGRES_PORT` per stack. The internal
  `DATABASE_URL` stays `db:5432` in both stacks since it targets each project's own network.
- Documentation uses prose + bullet lists rather than tables, per the project's narrative-docs
  convention.

**Code locations**: `docs/devops-strategy.md` (§ Running Two Stacks Concurrently; Configuration
bullet), `CLAUDE.md` (§ Infrastructure), `README.md` (Deployment + Resources).

**Technical debt noted**: The runtime data-isolation test is documented but not executed here (needs
user-run full stack builds). No other debt.

---

### Amendment (2026-08-01) — docs updated for prod/dev split + PostgreSQL default

Follows the TASK-001 amendment and `implementation_plan.md` § Amendment; documentation-only.

**What changed:**
- **`docs/devops-strategy.md`**: flipped the DB default throughout to **PostgreSQL** (Scope, the
  Containerisation `db` row, Database & Migrations, Configuration, Deployment/Run, Open Items), with a
  STORY-024 amendment note added to the setup-time assumptions blockquote clarifying that the backend
  code fallback is still SQLite while the *deployment* default is now Postgres. Rewrote § Running Two
  Stacks Concurrently to the two-file model ("prod" = `.env.example`, "dev" = `.env.dev.example`),
  renaming "live" → "prod", `STACK_NAME` `local` → `prod`/`dev`, and updated the isolation-verification
  commands/volume-name examples. Added `.env.dev.example` to Repository Hygiene and the Ownership table.
- **`README.md`**: DB default line flipped to PostgreSQL; the two-stacks subsection rewritten to the
  `cp .env.example .env` (prod) / `cp .env.dev.example .env` (dev) model; Resources table Postgres row
  relabeled "default DB".
- **`CLAUDE.md` § Infrastructure** (devops-owned section only): Postgres row, concurrent-stacks
  paragraph, Database paragraph, Config paragraph, and IaC-files list updated for the two-file
  prod/dev split and the Postgres default.

**Known follow-up (out of my ownership):** the architect-owned `## Gotchas` line in `CLAUDE.md` still
reads "DB is configurable (SQLite default | PostgreSQL)". Its substantive rule (keep code DB-agnostic;
SQLite must use WAL) is unaffected; only the parenthetical "default" is now stale. Flagged for the
architect to reconcile — I did not edit outside my section.

**Verification**: config-level render evidence recorded in the TASK-001 amendment. No runtime build run
(user-run per convention).
