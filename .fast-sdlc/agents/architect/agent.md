# architect — References

Setup completed under STORY-001 / TASK-002 (2026-08-27, SESSION-002). This project is an
**existing, fully-built system** adopted into `fast-sdlc`, so the artifacts I own are primarily
**as-built Technical Documentation**, not fresh design. During Setup the user chose the full
"from scratch" path: adopt the plugin's clean artifact model, reformat/relocate the legacy assets,
and migrate all as-built content now (not deferred to a later Reconcile).

## Formats (all plugin defaults, copied into this folder, used as-is)
The default templates ship here and were adopted **as-is** (no customization):
- `architecture/sad-format.md` — SAD (master/entry doc of the Technical Documentation folder)
- `architectural-design/solution-overview-format.md` (+ `system-context-*`, `key-components-*`
  graph/diagram formats) — Solution Overview and its C4 Level 1/2 graph+diagram pairs
- `architectural-design/nfr-format.md` — NFR
- `architectural-design/tech-plan-format.md` — Technical Implementation Plan
- `architectural-design/architectural-design-format.md` — Architectural Design index
- `api-contract-format.md` — API Contracts (one file per service)
- `adr-format.md` — ADR Log (matches the legacy `docs/tech_decisions/` shape exactly — see below)
- `persistence-map-format.md` — Persistence Map (**not used** — single-store system, see Data Models)
- `story-implementation-plan-format.md` — Story Implementation Plan
- `claude-md-format.md` — CLAUDE.md

## ADR Log
- **Location**: `documentation/technical/adr-log/` — 31 ADRs (`ADR-001`…`ADR-031`) migrated here
  from the legacy `docs/tech_decisions/` via `git mv` (history preserved). The legacy files already
  matched the plugin `adr-format.md` exactly, so the "reformat" was a straight move.
- **Numbering**: sequential across the whole project — next id is **ADR-032**. Check the folder
  before assigning.
- **Cross-references**: `docs/architecture.md` (legacy) referenced ADRs by ID; the SAD
  (`documentation/technical/sad.md`) is now the referencing master. ADR-009 is superseded by ADR-010;
  ADR-005 by ADR-021 (see each ADR's `Status`). ADR immutability rule applies — never edit an ADR
  body, only its `Status`.

## Data Models — Physical Data Model format (first storage platform)
- **Single store, DB-agnostic.** The system uses one logical store realized via SQLAlchemy 2.0 ORM +
  Alembic migrations, running identically on **PostgreSQL** (deployment default, ADR-031) and
  **SQLite** (opt-in) — ADR-002. Because there is exactly one store, there is **no Persistence Map**
  (that artifact is only for polyglot/multi-store systems).
- **Adopted Physical Data Model format**: a relational, dialect-portable markdown style — per-table
  column tables (Column | Type | Constraints/Notes) + Relations & Cascade + Indexes + Portability
  Constraints (SQLite ⇄ PostgreSQL) + Seed Data. This is the style the project already used in
  `docs/architecture.md` § Database Schema; adopted as the PDM format for this platform (no
  per-platform template ships by default). Lives at
  `documentation/technical/data-models/physical-data-model.md`.
- If a genuinely new storage platform is ever introduced, confirm its own PDM format with the user
  first (per DATA MODELING > "New storage platform") and register it here.

## Legacy assets — disposition (decided with user, SESSION-002)
- `docs/tech_decisions/` → **moved** to `documentation/technical/adr-log/` (folder removed).
- `docs/api-contract.md` (v1.x LOCKED) → **content adopted**, reformatted into
  `documentation/technical/api-contracts/coordination-service.md`. Legacy file kept as historical
  record, not written to going forward.
- `docs/architecture.md` (~528 lines) → **content migrated** into the `documentation/technical/`
  folder (SAD, Solution Overview + C4, NFR, Physical Data Model, Deployment/Infrastructure View).
  Legacy file kept as historical record, not written to going forward.
- `docs/technical_roadmap.md` → **superseded** — it was a pre-implementation sequencing plan and
  everything in it is built. Its modern equivalent (the Technical Implementation Plan) lives inside
  Architectural Design, produced per-scope going forward. Legacy file kept as historical record.

## As-built content conventions
- Technical Documentation reads as **current state**. The legacy `<!-- updated: … reconcile -->`
  provenance comments were dropped during migration — that history lives in git and in the ADRs.
- Non-functional characteristics (performance, accessibility, platform support) are **architect's**
  (and qa-automation's) territory, captured in `documentation/technical/nfr.md` — the business-analyst
  deliberately excluded them from the business-facing Documentation (they must reflect measured
  values, not aspirational business targets).

## Reconcile note — STORY-002 (TASK-002)
STORY-002 finished the v1.10 correction: prose *about* the deleted endpoints survived in several places
after the entries themselves were gone. The Technical Documentation folder needed no change at this
Reconcile — the contract, SAD, Physical Data Model, Solution Overview, NFR, Deployment view and ADR Log
were already clean and internally consistent, and no ADR references the deleted surfaces. What changed
was my own reference material: this file's STORY-001 note above, and the `### API Contract` chapter in
`fast-sdlc-project-setup.md`, both of which named the endpoints and framed the deletion as a
*retirement*.

**Convention set by the user here, applies to every future as-built correction:** deleting
documentation of something that never existed is a plain deletion, not a retirement. No version bump,
no revision-history narrative, no ADR, and no residual prose naming what was removed — including in
role config and reference files, not just the artifact itself. Where a real hazard needs guarding
against, phrase the guard generically (a durable rule that outlives the specific item) rather than by
enumerating what was deleted.

## Reconcile note — STORY-001 (TASK-011)
STORY-001 was a **process** story (every role's `fast-sdlc` Setup); no product code changed, so
Solution Overview, NFR, the Deployment/Infrastructure View, and the C4 graph/diagram pairs needed **no
correction** — they were already as-built and the system they describe is untouched. What did change:

- **API Contract → v1.10, an as-built correction.** Documentation of several reads that were never built
  was deleted, by explicit user decision. I had first marked them `NOT IMPLEMENTED` in place, reasoning
  that build-vs-delete was a product call; the user made that call — delete. The `/v1` base path and the
  `projects` trailing-slash quirk are now stated explicitly.
  **Precedent for future Reconciles: on this project, a specified-but-unbuilt surface is deleted from
  the contract, not carried as an annotated placeholder.** The contract describes what exists.
- **No new ADRs.** Every decision this story made was about *where documentation lives* — no ecosystem
  choice, nothing hard to reverse in code, no data/security/performance impact. Deliberately dropped
  per TECH DECISIONS POLICY; next id is still **ADR-032**.
- **ADR bodies keep their stale legacy paths.** ADR-001, ADR-007, ADR-011, ADR-015 and ADR-026 cite
  `docs/*` files that no longer exist. Immutability rule — bodies are never edited. A reading note in
  the SAD's Architecture Decisions section tells readers how to resolve them instead.
- **The legacy `docs/` tree is gone**, not archived (deleted in commit `7f52733`). Anything that says
  "retained as historical record" about `docs/architecture.md` / `docs/api-contract.md` /
  `docs/technical_roadmap.md` — including the disposition section above — is superseded: they survive
  in git history only.
- **A Logical Data Model now exists**, at `documentation/business/logical-data-model/`
  (business-analyst's, produced during its own Setup). The Physical Data Model now names it as its
  canonical business-meaning source and records the two deliberate physical deviations
  (`comment.ancestors` vs. logical `parent_comment_id`; JSON-array realization of `Label`/`SettingValue`).
  On any future data-model work, read the Logical model first — do not re-derive business meaning.

## Known open items carried from the legacy docs (not fixed here — need follow-up work)
Recorded so they aren't lost; each is a real gap, not a documentation artifact of the migration:
- **Clear-override has no end-to-end surface** — service method `clear_project_setting` exists but no
  REST route/MCP tool exposes it; the SPA calls a non-existent `DELETE /projects/:id/settings/:key`.
  Needs a contract revision off LOCKED + a backend route. (business-analyst also notes this as a
  business-facing known limitation.)
- **SQLite FK actions are inert** — `PRAGMA foreign_keys = ON` is not set, so `ON DELETE CASCADE` /
  `SET NULL` are inert on SQLite (enforced on PostgreSQL). App-level cleanups cover the built cases
  (ADR-018); the resolution path is to enable the PRAGMA and restore the downgraded cascade tests.
- **`link_types` duplicate-value returns 400, not the story-specified 422** — status-code-only
  divergence; behavior/message correct.
- **`projects` is the one trailing-slash collection route** (`/v1/projects/` vs. `/v1/stories`), so
  `/v1/projects` answers `307` and a redirect-following client can silently drop a `POST` body. A
  one-line router fix resolves it.
