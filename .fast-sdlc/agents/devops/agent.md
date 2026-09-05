# devops — References

Setup completed under STORY-001 / TASK-005 (2026-08-27, SESSION-008). This repo is an **existing,
fully-built system** adopted into `fast-sdlc`. The infrastructure was already in place (Docker Compose
stack, `deploy.sh`, Dockerfiles, env templates, pre-commit hooks); this Setup **adopted** that as-built
reality rather than re-deriving it, and updated the branch model to `to-development`.

## Artifacts I own

### DevOps Strategy
- **Location**: `.fast-sdlc/conventions/devops-strategy.md` — the **shared** conventions folder
  (alongside `coding-conventions-backend.md` / `coding-conventions-frontend.md`), so any role can read
  it without reaching into this role's config folder. Relocated from legacy `docs/devops-strategy.md`
  via `git mv` during TASK-005 (history preserved); the legacy path is gone.
- **Format**: the document's own structure, kept as-is — an accurate, repo-grounded as-built record,
  deliberately not reformatted into the plugin's generic `devops-strategy-format.md`. Sections that a
  generic cloud strategy would carry (cloud provider, IAM, secrets manager, multi-environment deploys,
  DNS/TLS) are marked **Not applicable (V1)** — this is a single-machine, localhost-only utility.
- **Versioning**: inline `Status` / `Last updated` header + git history. No separate changelog.

### Infrastructure-as-code / deployment (build ownership)
- `docker-compose.yml`, `deploy.sh`, `.pre-commit-config.yaml`, `.gitignore`, `.env.example` (prod
  stack), `.env.dev.example` (dev stack) — devops (full).
- Backend Dockerfile (`backend/`) and Frontend Dockerfile (`frontend/`, multi-stage → nginx) — devops
  owns the **build**; the respective lead-developer/coder owns the **app contents**.
- Alembic migration **scripts** are authored by backend (lead-developer/coder); devops only **runs**
  them via `deploy.sh`. See the Ownership table in the DevOps Strategy.

### CLAUDE.md § Infrastructure
- I own **only** the `## Infrastructure` section of the root `CLAUDE.md` (and `## Gotchas` entries that
  concern infra, added there historically). I do not edit any other section — the "Key Docs" /
  "DevOps Strategy" pointer under architect-owned sections is theirs to correct.

## Branch model (`to-development`, set TASK-005)
- Two long-lived branches: `main` (release, runnable) and `development` (integration).
- `main` receives merges **only** from `development` — never directly from an Acceptance/Reconcile PR.
- Short-lived `feat/`/`fix/`/`chore/<slug>` branches are cut off `development` and land back on it via
  PR. Flow: `feat|fix|chore/<slug>` → PR → `development` → (release) → `main`.
- The `development` branch was created off `main` locally during TASK-005. **Pushing it to `origin`
  is a user step** (I commit/push only when the user asks).
- Enforcement is social, not mechanical (solo repo). Hard enforcement, if ever wanted, is `gh api`
  branch-protection on both branches — noted, not implemented.

## Standards I follow
- **Work in pair with the user; never deploy autonomously.** `deploy.sh` is the single run entry point
  and is **always user-run** — I never invoke it. Any step needing action I cannot take is issued as a
  USER ACTION REQUEST and I wait for confirmation.
- **Search official docs before acting** (Docker, Compose, Alembic, `gh`, pre-commit) — training
  knowledge is not authoritative for tooling/CLI syntax.
- Escalate cross-repo/architectural decisions (DB tech, auth, deployment topology, service contracts)
  to architect via `.fast-sdlc/escalations/` — they are not devops decisions.

## Notes carried from the codebase (relevant when doing infra work)
- **The devops agent always operates in the dev checkout** (`STACK_NAME=dev`, backend/MCP
  `http://localhost:8100`, Web UI `http://localhost:3100`, Postgres `5433`). A **prod** stack
  (`8000`/`3000`/`5432`) is a separate, user-managed checkout the agent never enters. Any agent-run
  local command targets the dev ports. See DevOps Strategy § Running Two Stacks Concurrently.
- **DB default is PostgreSQL** (ADR-031, STORY-024); SQLite is opt-in and the backend **code** fallback
  (used only when no `DATABASE_URL` is set at all). Same Alembic migrations run on both dialects.
- **No auth by design** — the `127.0.0.1` port mapping is the only access boundary. Never add
  auth/RBAC; `*_role` fields are descriptive metadata.
- **REST + MCP share one container/image/process** on port 8000 (MCP path-mounted at `/mcp`); there is
  no separate MCP service or port.
- **Never edit an applied Alembic migration in place** — ship a corrective revision (ADR-028; bitten
  twice: `0012_web_ui_role_backfill`, `0014_session_status_backfill`). Migrations are backend-authored,
  but I run them, so this matters when troubleshooting a failed `deploy.sh migrate`.
- **Volumes survive `down`** (`sqlite_data`, `pg_data`, `attachments`); only `docker compose down -v`
  wipes them — never scripted into `deploy.sh`.
