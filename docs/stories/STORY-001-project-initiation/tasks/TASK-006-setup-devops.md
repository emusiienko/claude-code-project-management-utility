---
status: Done
assignee: devops
story: STORY-001
---

# TASK-006: Setup — devops

## What to implement
Run the devops Setup workflow: produce docs/devops-strategy.md covering infrastructure, CI/CD, and deployment strategy, then pause for user approval.

## Scope
docs/devops-strategy.md

## Dependencies
TASK-003

## Acceptance Criteria
- [x] docs/devops-strategy.md created
- [x] User has reviewed and approved the devops strategy

---
## Implementation Report
**Date**: 2026-06-29

**What was done**:
Ran the devops Setup workflow and produced `docs/devops-strategy.md`, right-sized for the architecture (single-developer, single-machine, localhost-only utility, no auth, Docker Compose stack — per `docs/architecture.md`, ADR-002/003/004). The strategy covers: scope & non-goals (with cloud/IAM/secrets/multi-env explicitly marked Not applicable for V1), the single `local` environment, branch strategy (`main` + short-lived `feat/`/`fix/`/`chore/` branches, no `develop`), containerisation & stack topology (`backend` REST+MCP on :8000 same process, `web` nginx :3000, `db` postgres:18 :5432, all bound to 127.0.0.1), database & migrations (PostgreSQL default / SQLite opt-in, Alembic on `deploy.sh`), configuration & "secrets" (12-factor env vars, no application secrets), local pre-commit hooks as quality gates (no CI service), the `deploy.sh` Compose-wrapper entry point, minimal-infra rollback/recovery, repository hygiene, and an ownership matrix. The document was paused for user review and has now been approved.

**Deviations from plan**:
None. The task scope was limited to producing the strategy document and pausing for approval; the scaffold (`docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`, `.gitignore`, `.env.example`, Dockerfiles) and the `CLAUDE.md` § Infrastructure fill-in are deferred to a follow-up devops implementation task as noted in the strategy's closing section.

**Technical decisions made**:
- Quality gates run as local pre-commit hooks rather than a CI service — appropriate for a solo, localhost-only repo with no external runner.
- Branch protection documented by convention (social, not mechanical) — no Terraform/`gh` enforcement for a single-developer repo; reintroducing CI/branch-protection noted as the cheapest V2 path if the tool is ever exposed beyond localhost.
- `deploy.sh` is a thin, readable wrapper over `docker compose` (up/down/rebuild/migrate/logs) with the PostgreSQL-default / SQLite-opt-in switch driven by `DATABASE_URL` + a Compose profile. No orchestration tool, no remote state, no CD trigger.
- Single backend container serving both REST and MCP in one process on :8000 (MCP mounted on a path), matching `api-contract.md` and ADR-003 — no separate MCP service or port.
- Rollback kept to native primitives (git tag + `alembic downgrade`), volumes preserved on `down`, manual optional backup — no automated backup job in V1.

**Code locations**:
- `docs/devops-strategy.md` — the approved DevOps strategy document.

**Technical debt noted**:
- The open items recorded in the strategy under "Open Items for User Confirmation" (branch model and `deploy.sh` Compose-wrapper assumptions) were carried as assumptions during setup and are validated by this approval.
- If V2 ever exposes the tool beyond localhost, the strategy must be revisited: auth, TLS, secrets management, a real multi-environment model, and server-side CI/branch-protection would all become in scope.