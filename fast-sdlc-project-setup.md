# Project Setup

---

## Team

### orchestrator
**folder**: `.fast-sdlc/agents/orchestrator/`

### business-analyst
**folder**: `.fast-sdlc/agents/business-analyst/`
**working folder(s)**: `documentation/business/`, `.fast-sdlc/requirements/`

### architect
**folder**: `.fast-sdlc/agents/architect/`
**working folder(s)**: `.` (project root)

### lead-developer (backend)
**folder**: `.fast-sdlc/agents/lead-developer/backend/`
**working folder(s)**: `backend/` (this stack's Source Code location)

### lead-developer (frontend)
**folder**: `.fast-sdlc/agents/lead-developer/frontend/`
**working folder(s)**: `frontend/` (this stack's Source Code location)

### coder (backend)
**folder**: `.fast-sdlc/agents/coder/backend/`
**working folder(s)**: `backend/` (this stack's Source Code location)

### coder (frontend)
**folder**: `.fast-sdlc/agents/coder/frontend/`
**working folder(s)**: `frontend/` (this stack's Source Code location)

Note (2026-08-27): this repo has two stacks (backend Python, frontend React —
see `CLAUDE.md` > Repository Structure). Per `sdlc`, lead-developer and coder are repo-bound but
scoped to one stack per session when a repo has more than one — reflected here as one folder/record
per stack, each running its own Setup and owning its own Coding Conventions.

### devops
**folder**: `.fast-sdlc/agents/devops/`
**working folder(s)**: `.` (project root — Infrastructure Code location)

### qa-automation
**folder**: `.fast-sdlc/agents/qa-automation/`
**working folder(s)**: `automation/` (Automated Test Suite location)

### manual-qa
**folder**: `.fast-sdlc/agents/manual-qa/`
**working folder(s)**: `qa/` (Test Case Registry location)

---

## Configs Folder

`.fast-sdlc/`

---

## Task Management

**skill**: `file-based-task-management`
**location**: `.fast-sdlc/task-management/`

Note: the prior (pre-`fast-sdlc`) process's `docs/stories/` and `docs/stories/archive.md` held the
historical record of stories from that process — removed 2026-08-27 (STORY-001) once no longer needed
for reference.

---

## Sessions

**mechanism**: `file-based-session-management` (default skill)
**location**: `.fast-sdlc/sessions/`

---

## Pull Requests

**strategy**: `to-development`
**target branch**: `development` — `main` receives merges only from `development`, never directly
from an Acceptance/Reconcile Pull Request.

Note (resolved 2026-08-27, STORY-001/TASK-005, SESSION-008): the DevOps Strategy has been updated for
this model and relocated to `.fast-sdlc/conventions/devops-strategy.md` (see Artifacts > DevOps
Strategy). Its § Branch Strategy now documents `to-development`. The `development` branch was created
off `main` during TASK-005 (local; pushing it to `origin` is a user step).

---

## Escalation/Feedback

**mechanism**: file-based escalation folder — see `.fast-sdlc/escalations/escalation-skill.md`
**location**: `.fast-sdlc/escalations/`

Any role escalating to, or responding to, another role must load
`.fast-sdlc/escalations/escalation-skill.md` first. Each escalation lives in its own file
(`escalation-<topic>-<requester>-<responders>.md`) allowing a back-and-forth conversation until the
requester marks it closed; `.fast-sdlc/escalations/index.md` tracks open/closed status across all
of them. The orchestrator checks for new or updated escalations after each agent's task run and
routes a response by spawning the responder role.

---

## Artifacts

<!--
One ### chapter per sdlc-defined artifact, free form. Each role fills in its own chapter(s) during
its own Setup workflow — orchestrator does not populate these.
-->

### Validated Idea
**format**: default `business-analyst` template (Problem Statement / Target Users / Core Value
Proposition / MVP Scope IN-OUT / Roles & Permissions / Key Assumptions / Risks & Mitigations /
Success Metrics / Open Questions) — used as-is.
**location**: `.fast-sdlc/requirements/validated_idea/` (`latest.md` + `changelog.md`, per
`file-based-versioning`). Read `latest.md` for the current state; `changelog.md` for how it got
there. Adopted from the prior process's `docs/validated-business-idea/` during business-analyst
Setup (STORY-001) — that folder is kept only as historical record (v1–v2), not written to going
forward.

### Requirements
**format**: folder tree — `index.md` (Feature List) + one file per feature (Validation Rules,
Error Handling, Usage Limits where applicable); `non-functional.md` added only once a pending change
actually needs one (see Business Documentation below re: non-functional ownership). Data model here
holds **only** the Conceptual Data Model — a mandatory structured YAML artifact, `conceptual-data-model/`
(entities + relationships, business language), composed and approved per subject area (`DATA MODELING`
process) — using the plugin's default format as-is. The Logical Data Model (complete attributes,
identifiers, foreign keys, normalized to 3NF) is **not** produced here at all — per the 2026-08-27
(TASK-008) plugin update, its sole, permanent home is Business Documentation's `logical-data-model/`
(see below); it's composed directly there, per subject area, during that subject area's story
execution — never drafted in Requirements and carried across. Holds **pending scope only** — once a
feature ships and is reconciled, its file moves out of here into Business Documentation.
**location**: `.fast-sdlc/requirements/specs/`. Read `index.md` first — currently **empty (no
pending scope)** as of business-analyst Setup (STORY-001): almost everything described in the prior
process's `docs/requirements.md` + `docs/requirements/` was already built, so it moved to Business
Documentation instead (see below). Two known-but-not-yet-commissioned product limitations were found
during that migration and are noted in Business Documentation only (not modeled as active
Requirements, by explicit user decision) — see `documentation/business/settings.md` and
`documentation/business/cross-project-queries.md`. API-contract/endpoint-shape content was
deliberately left out of the migration entirely — that's architect's territory
(`docs/api-contract.md`).

### Business Documentation
**location**: `documentation/` at the repo root — two owners, each in their own
subfolder: business-analyst's business-facing part is `documentation/business/`; architect's
technical/system-facing counterpart, Technical Documentation, is `documentation/technical/` (see
Architecture below).
**business-facing format**: `index.md` (Capability | File | Summary | Access — no priorities, no
story/task references) + one file per capability (`Happy Path` / `Other Scenarios` / `Who Can Access
It` / `Business Rules` / `Known Limitations`), a deliberately different shape from Requirements'
per-feature files since Business Documentation narrates as-built behavior rather than listing
validation rules and error tables. Plus two project-wide data model artifacts, not symmetric with
Requirements: `conceptual-data-model/` — the same artifact as Requirements' own, transcribed here
as-built, with no fresh approval checkpoint (see business-analyst agent > MODE 3: RECONCILE) — and
`logical-data-model/` — its sole, permanent home (not a copy of anything in Requirements), populated
directly, per subject area, by that subject area's Logical Data Model Task during a story's execution
(see business-analyst agent > DATA MODELING), corrected in place at Reconcile if what was built
diverged. As of 2026-08-23 these cover all five subject areas (Project & Work Items, Work Item
Linking, Collaboration, Sessions, Settings) built into the product so far, approved area-by-area with
the user in SESSION-001. Non-functional
characteristics (performance, accessibility, browser/device support) are deliberately **not** part
of this business-facing part at all — by explicit user decision, that content must reflect real
values from real tests, so it belongs to the technical roles that can measure it (architect and/or
qa-automation), not business-analyst; see Technical Documentation (architect's part) for that.
Migrated from the prior process's `docs/requirements/requirements_backend.md` +
`requirements_web.md` during business-analyst Setup (STORY-001) — those two documents blended
already-built behavior with known gaps and full API-contract detail; the as-built, business-facing
portion moved here (with the two known-but-not-yet-commissioned gaps noted inline as limitations,
not modeled as Requirements — see Requirements above), and the API-contract portion was left where
it already lived (`docs/api-contract.md`, architect's).

### Architecture
**location**: `documentation/technical/` — the as-built **Technical Documentation** folder, the
technical/system-facing sibling of business-analyst's `documentation/business/`. One location for the
whole folder; its parts are not separately located:
- `sad.md` — Software Architecture Document, the master/entry doc (read this first)
- `solution-overview/` — Solution Overview + its C4 Level 1/2 graph (`.yaml`) + diagram (`.mmd`) pairs
- `nfr.md` — measurable non-functional targets (architect's territory, not business-analyst's)
- `data-models/physical-data-model.md` — as-built schema (single DB-agnostic store; **no** persistence
  map — that's multi-store only)
- `api-contracts/` — one file per service (currently `coordination-service.md`)
- `deployment/deployment-infrastructure-view.md` — system-level topology (not IaC; devops owns IaC)
- `adr-log/` — 31 ADRs (`ADR-001`…`ADR-031`), referenced by ID from the SAD; next id ADR-032

**format**: plugin defaults, copied into `.fast-sdlc/agents/architect/` and used as-is. Migrated
"from scratch" during architect Setup (STORY-001/TASK-002) from the legacy single-file
`docs/architecture.md` + `docs/api-contract.md` + `docs/tech_decisions/`, removed 2026-08-27
(STORY-001) once no longer needed for reference. See `.fast-sdlc/agents/architect/agent.md`.

### API Contract
**location**: part of the Architecture folder above — `documentation/technical/api-contracts/`
(one file per service). Format: `.fast-sdlc/agents/architect/api-contract-format.md`. The contract is
**LOCKED**, as-built head **v1.10**; changes need an architect-approved revision. Every REST route is
under the `/v1` base path. v1.10 **retired** three reads that were specified but never built
(cross-project `GET /stories`, top-level `GET /tasks`, `GET /tasks/:id/dependencies`) — see the
contract's own v1.10 note. Legacy `docs/api-contract.md` removed 2026-08-27 (STORY-001).

### Architectural Design
**location**: `.fast-sdlc/planning/{slug}/architecture-design/` — **one folder per scope** (a
milestone or story group; `{slug}` is the scope name, kebab-case). Holds architect's Phase-1 (Scope
Planning) output for that scope: Solution Overview draft, NFR draft, Technical Implementation Plan.
**Currently empty (no pending scope)** — the whole existing system is already built and reconciled
into the Architecture folder above; a scope folder is created the first time a milestone/story group
needs planning. See `.fast-sdlc/planning/README.md`. Mirrors Requirements' empty pending-scope area.
The legacy `docs/technical_roadmap.md` (a pre-implementation sequencing plan, fully built) is
superseded; its modern equivalent is the Technical Implementation Plan produced here per scope.

### Story Implementation Plan
**location**: **inside the story's own folder** under Task Management —
`.fast-sdlc/task-management/STORY-NNN-<slug>/story-implementation-plan.md` (alongside the story's
`description.md` and `tasks/`). One per story, produced during a story's execution window only when it
crosses repo boundaries or needs coordinated steps from other roles. **None yet.** Format:
`.fast-sdlc/agents/architect/story-implementation-plan-format.md` (as-is).

### Coding Conventions
One per stack (this repo has two — backend, frontend), each owned by that stack's lead-developer
instance but kept in a shared `.fast-sdlc/conventions/` folder (not inside the owning role's own
config folder) so coder can read it directly.
- **backend** (set STORY-001/TASK-003, SESSION-004; relocated 2026-08-27, user-directed correction):
  `.fast-sdlc/conventions/coding-conventions-backend.md`.
  **format**: the document's own structure, kept as-is — adopted from the legacy
  `docs/backend-coding-conventions.md` (relocated via `git mv`, three factual corrections applied),
  which is richer and more repo-grounded than the plugin's generic `coding-conventions-format.md`.
  **versioning**: inline `Last updated / rev N` header + git history (no separate changelog).
- **frontend** (set STORY-001/TASK-009, SESSION-005; relocated 2026-08-27, user-directed correction):
  `.fast-sdlc/conventions/coding-conventions-frontend.md`.
  **format**: document's own structure, as-is — adopted verbatim from legacy
  `docs/frontend-coding-conventions.md` (relocated via `git mv`, no edits, user decision).
  **versioning**: document state + git history.

### Implementation Plan
- **backend** (set STORY-001/TASK-003, SESSION-004): inside each story's own folder —
  `.fast-sdlc/task-management/STORY-NNN-<slug>/implementation-plan-backend.md` (alongside
  `description.md`, architect's `story-implementation-plan.md`, and `tasks/`). The `-backend` suffix
  distinguishes it from the frontend stack's plan for the same story. **format**:
  `.fast-sdlc/agents/lead-developer/backend/implementation-plan-format.md` (plugin default, as-is).
  Task Management is file-based (see Task Management above).
- **frontend** (set STORY-001/TASK-009, SESSION-005): as backend, per story —
  `.fast-sdlc/task-management/STORY-NNN-<slug>/implementation-plan-frontend.md`. **format**:
  `.fast-sdlc/agents/lead-developer/frontend/implementation-plan-format.md` (plugin default).

### Repo-level ADRs
Stack-scoped decisions only — distinct from architect's project-level ADR Log
(`documentation/technical/adr-log/`), each with independent numbering. Both stacks keep their ADR log
inside their own stack folder at the repo root.
- **backend** (set STORY-001/TASK-003, SESSION-004; location corrected 2026-08-27): `backend/adr-log/`
  — inside the backend stack folder. Sequential within the backend stack, starting at `ADR-001`;
  **none yet**. **format**: `.fast-sdlc/agents/lead-developer/backend/adr-format.md` (plugin default,
  as-is). ADR immutability rule applies (edit `Status` only).
- **frontend** (set STORY-001/TASK-009, SESSION-005): `frontend/adr-log/` — inside the stack folder.
  Sequential from `ADR-001`, own series; **none yet**. **format**:
  `.fast-sdlc/agents/lead-developer/frontend/adr-format.md` (plugin default).

### Source Code
**owner**: coder (full, per repo/stack); lead-developer (full, same location, only when writing code
directly — MODE 5).
**location**:
- **backend**: `backend/`
- **frontend**: `frontend/`
Confirmed with the user during this plugin-update refresh (net-new Artifact chapter as of the
`fast-sdlc` plugin's "added agents working folders and source artifacts" update; the code itself
predates this — this chapter just formally records where it already lives, per stack).

### QA Strategy
**owner**: manual-qa.
**location**: `.fast-sdlc/conventions/qa-strategy.md`. Relocated from legacy `docs/qa-strategy.md` via
`git mv` (STORY-001/TASK-007).
**format**: document's own structure, as-is.

### Test Case Registry
**owner**: manual-qa.
**location**: `qa/` (top-level, repo root): `qa/test-cases.md` (master index), `qa/test-cases/`
(individual TC files), `qa/results/` (temp run logs). Relocated from legacy `docs/qa/` via `git mv`
(STORY-001/TASK-007).
**format**: unchanged from the legacy registry.

### QA Automation Strategy
**owner**: qa-automation.
**location**: `.fast-sdlc/agents/qa-automation/strategy.md` (this role's own config folder — small
enough, and specific enough to this role, that it doesn't need the shared `.fast-sdlc/conventions/`
folder the way coding-conventions/devops-strategy/qa-strategy do). Set STORY-001/TASK-006,
SESSION-010 (2026-08-27). Supersedes (does not adopt) the legacy `docs/qa-automation-strategy.md`,
which claimed ownership of the `backend/tests/` integration suite — that ownership had already moved
to `coder` (backend) via `.fast-sdlc/conventions/coding-conventions-backend.md` § Testing by the time
this Setup ran. The legacy file was removed 2026-08-27 (STORY-001) once no longer needed for
reference.
**format**: own structure — see the strategy doc itself for its chapters.

### Automation Test Suite
**owner**: qa-automation.
**location**: `automation/` at the repo root — a sibling of `backend/`, `frontend/`,
`documentation/`; its own npm project, not nested inside this role's config folder (a runnable
artifact, not role configuration — mirrors why manual-qa's `qa/` test-case registry is also
top-level). Set STORY-001/TASK-006 (2026-08-27) — a net-new artifact, not a relocation; it did not
exist under the prior process.
**format**: `@playwright/test` (TypeScript), `request` fixture only (no browser); one spec file per
API Contract domain under `automation/tests/`. See `automation/README.md` for run commands, and its
§ Known Quirks / Known Divergences for as-built backend behavior that differs from the contract.

### Infrastructure Code
**owner**: devops (full).
**location**: `.` (repo root) — a single stack/environment (local Docker Compose, prod+dev
concurrent stacks per STORY-024). Spans `docker-compose.yml`, `deploy.sh`, `backend/Dockerfile`
(+ `docker-entrypoint.sh`), `frontend/Dockerfile` (+ `nginx.conf`), `.env.example`,
`.env.dev.example` — no single dedicated IaC folder. Confirmed with the user during this
plugin-update refresh (net-new Artifact chapter, same rationale as Source Code above).

### DevOps Strategy
**owner**: devops.
**location**: `.fast-sdlc/conventions/devops-strategy.md` — the shared conventions folder (alongside
the two coding-conventions docs), so any role can read it without reaching into another role's config
folder. Relocated from legacy `docs/devops-strategy.md` via `git mv` during devops Setup
(STORY-001/TASK-005, SESSION-008) — history preserved; the legacy path is gone, not kept as a
historical copy.
**format**: the document's own structure, kept as-is (adopted, not reformatted) — it is already an
accurate, repo-grounded as-built record (single-machine, localhost-only Docker Compose stack; no
cloud/IAM/secrets; PostgreSQL deployment default with SQLite opt-in per ADR-031/STORY-024; dual
prod/dev concurrent stacks). It supersedes the plugin's generic `devops-strategy-format.md`.
**versioning**: inline `Status` / `Last updated` header + git history (no separate changelog).
**branch model**: `to-development` (see Pull Requests below) — documented in the strategy's
§ Branch Strategy. The `development` branch was created off `main` during TASK-005.
