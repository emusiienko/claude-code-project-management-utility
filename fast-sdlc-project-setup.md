# Project Setup

---

## Team

### orchestrator
**folder**: `.fast-sdlc/agents/orchestrator/`

### business-analyst
**folder**: `.fast-sdlc/agents/business-analyst/`

### architect
**folder**: `.fast-sdlc/agents/architect/`

### lead-developer
**folder**: `.fast-sdlc/agents/lead-developer/`

### coder
**folder**: `.fast-sdlc/agents/coder/`

### devops
**folder**: `.fast-sdlc/agents/devops/`

### qa-automation
**folder**: `.fast-sdlc/agents/qa-automation/`

### manual-qa
**folder**: `.fast-sdlc/agents/manual-qa/`

---

## Configs Folder

`.fast-sdlc/`

---

## Task Management

**skill**: `file-based-task-management`
**location**: `.fast-sdlc/task-management/`

Note: `docs/stories/` and `docs/stories/archive.md` hold the historical record of stories from the
project's prior (pre-`fast-sdlc`) process — kept for reference only, not written to going forward.

---

## Sessions

**mechanism**: `file-based-session-management` (default skill)
**location**: `.fast-sdlc/sessions/`

---

## Pull Requests

**strategy**: `to-development`
**target branch**: `development` — `main` receives merges only from `development`, never directly
from an Acceptance/Reconcile Pull Request.

Note: `docs/devops-strategy.md` still describes a `main`-only branch model (no `develop` branch).
This is being superseded — the `development` branch is to be created, and `docs/devops-strategy.md`
needs a corresponding update (owned by devops, not orchestrator — to be routed as a Task when devops
work resumes).

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

### Validated Business Idea
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
actually needs one (see Documentation below re: non-functional ownership). Data model is **not** a
single file — it's two mandatory structured YAML artifacts, `conceptual-data-model/` (entities +
relationships, business language) and `logical-data-model/` (complete attributes, identifiers,
foreign keys, normalized to 3NF), each composed and approved per subject area before the next layer
starts (`DATA MODELING` process) — both use the plugin's default format as-is (confirmed
2026-08-23). Holds **pending scope only** — once a feature ships and is reconciled, its file moves
out of here into Documentation.
**location**: `.fast-sdlc/requirements/specs/`. Read `index.md` first — currently **empty (no
pending scope)** as of business-analyst Setup (STORY-001): almost everything described in the prior
process's `docs/requirements.md` + `docs/requirements/` was already built, so it moved to
Documentation instead (see below). Two known-but-not-yet-commissioned product limitations were found
during that migration and are noted in Documentation only (not modeled as active Requirements, by
explicit user decision) — see `documentation/business/settings.md` and
`documentation/business/cross-project-queries.md`. API-contract/endpoint-shape content was
deliberately left out of the migration entirely — that's architect's territory
(`docs/api-contract.md`).

### Documentation
**location**: `documentation/` at the repo root (sibling of `docs/`) — two owners, each in their own
subfolder: business-analyst's business-facing part is `documentation/business/`; architect's
technical/system-facing part is TBD (architect Setup).
**business-facing format**: `index.md` (Capability | File | Summary | Access — no priorities, no
story/task references) + one file per capability (`Happy Path` / `Other Scenarios` / `Who Can Access
It` / `Business Rules` / `Known Limitations`), a deliberately different shape from Requirements'
per-feature files since Documentation narrates as-built behavior rather than listing validation
rules and error tables. Plus the same two data model artifacts as Requirements —
`conceptual-data-model/` and `logical-data-model/` — transcribed here as-built, with no fresh
approval checkpoint (see business-analyst agent > MODE 3: RECONCILE); as of 2026-08-23 these cover
all five subject areas (Project & Work Items, Work Item Linking, Collaboration, Sessions, Settings)
built into the product so far, approved area-by-area with the user in SESSION-001. Non-functional
characteristics (performance, accessibility, browser/device support) are deliberately **not** part
of this business-facing part at all — by explicit user decision, that content must reflect real
values from real tests, so it belongs to the technical roles that can measure it (architect and/or
qa-automation), not business-analyst; see their own part of Documentation once it exists.
Migrated from the prior process's `docs/requirements/requirements_backend.md` +
`requirements_web.md` during business-analyst Setup (STORY-001) — those two documents blended
already-built behavior with known gaps and full API-contract detail; the as-built, business-facing
portion moved here (with the two known-but-not-yet-commissioned gaps noted inline as limitations,
not modeled as Requirements — see Requirements above), and the API-contract portion was left where
it already lived (`docs/api-contract.md`, architect's).

### Architecture
**location**: TBD — architect Setup

### API Contract
**location**: TBD — architect Setup

### Technical Roadmap
**location**: TBD — architect Setup

### Coding Conventions
**location**: TBD — lead-developer Setup

### Implementation Plan
**location**: TBD — lead-developer Setup

### Repo-level ADRs
**location**: TBD — lead-developer Setup
