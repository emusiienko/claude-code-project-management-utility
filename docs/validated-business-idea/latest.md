<!-- Superseded by .fast-sdlc/requirements/validated_idea/ (fast-sdlc-project-setup.md > Artifacts >
     Validated Business Idea), adopted as-is during business-analyst Setup (STORY-001, 2026-08-21).
     Kept here as historical record only — not written to going forward. -->

# Validated Idea: AI Agent Coordination Utility

> **Status:** Validated — core problem and scope confirmed through discovery session
> **Date:** 2026-07-21
> **Prepared by:** Product Strategist

## Problem Statement

AI agents in a multi-agent development pipeline have no persistent memory between sessions — each agent restarts with no context of prior decisions, statuses, or artifacts. Currently, all operational state (task statuses, implementation reports, session results) lives inside the git repository, so every agent state mutation generates a git diff that requires the orchestrator's manual review and approval. This creates a coordination bottleneck that slows down the entire pipeline.

## Target Users

- **Evgeniy — Human Orchestrator** — Solo software developer running a multi-agent development pipeline; owns the overall process, reviews and approves outcomes, conducts live working sessions with agents; technically fluent. Interacts with the utility primarily *through the orchestrator agent* (an AI agent instructed to read and write state on the human's behalf) — the same pattern used today. Uses the web UI for visibility and oversight, not as the primary operational interface.
- **AI Agents (various roles)** — Architect, backend-developer, spec-writer, qa-automation, frontend-developer, and others; operate in separate sessions with no shared memory; need to read current work state on startup and write results back directly, without going through git.

## Core Value Proposition

**1. Cross-repository coordination** — today each repository has its own isolated task stack (markdown files). Work that spans multiple repositories has no shared home: the orchestrator agent must mentally merge across repos, and there is no single view of all in-flight work. The utility provides one authoritative coordination space across all projects, enabling orchestration that was structurally impossible before. **Project is the universal top-level anchor for every module in the utility** — Tasks and Sessions today, any future module tomorrow (e.g. a dedicated test-case tracking module) — not a construct owned by or nested inside any single module. Managing projects and connecting other modules to them must remain possible without routing through any one module's view. *(Confirmed 2026-07-21, SESSION-018.)*

**2. Persistent state outside git** — an external, persistent store that lives entirely outside any repository. Agents read context on startup (via MCP) and write results directly — no git diffs, no approval gate for routine operations. The orchestrator's attention is reserved for decisions, not file approvals.

**3. Context continuity across restarts** — agents start each session knowing exactly where work stands, without reconstruction from files or memory.

Compared to the current markdown-file approach: the utility eliminates both the per-repo isolation of task state and the structural coupling between "agent writes state" and "orchestrator must approve the diff."

## MVP Scope

### ✅ IN

**Tasks Module**
- Stories — top-level work containers belonging to a project; support labels (including status from dictionary)
- Tasks — atomic work items inside a story; one assignee; support types, statuses, assignee roles — all from configurable dictionaries
- Attachments — artifacts (documents with change history, or external references) attached to stories or tasks
- Typed directed links between tasks (e.g. "depends on", "context")
- Comments/Records — notes with author and text, attached to a story or task; support labels
- Aggregated story state computed from task statuses (on demand)

**Sessions Module**
- Session record scoped to a project (**mandatory** — a session is never created "just for its own sake" outside a project context), with: start artifact (topic + context), optional result artifact (decisions + summary), status label, optional link to a story or task within that project
- Sessions retrievable per project, in addition to cross-project queries — supports agents and the orchestrator reviewing project-specific session history
- Ability to find sessions started but not yet completed (cross-restart continuity)

**Settings Module**
- Configurable value dictionaries per project: task statuses, task types, attachment types, link types, participant roles
- System-level defaults; project overrides only the differences
- New project works immediately on defaults, no required configuration

**Access Surfaces**
- MCP server — full access to all operations for AI agents
- Web UI — full CRUD access for the human orchestrator

**Cross-repository coordination** *(core value driver)*
- Unified task and story space across multiple repositories/projects — one orchestrator agent sees all in-flight work regardless of which repo it belongs to
- Per-project queries (default scope) and cross-project queries (full projection) both supported

### ❌ OUT

- **Multi-user / team distribution** — *Rationale: V1 is a personal tool for one orchestrator. Distribution adds onboarding, packaging, and auth complexity not justified at this stage. Revisit in V2.*
- **Migration tooling from existing markdown files** — *Rationale: coexistence is the V1 transition strategy; automated migration is a V2 concern once the utility proves its value.*
- **Full replacement of the current markdown-based system** — *Rationale: V1 coexists with the current system. The utility is additive until migration is complete.*
- **Process enforcement, workflow automation, or transition rules** — *Rationale: by design principle (passivity), permanently out. The utility stores facts; it does not drive process.*
- **Role-based access control** — *Rationale: by design principle (participant neutrality), permanently out. Human and agents are equal participants.*
- **Notifications, webhooks, or event streams** — *Rationale: agents pull state on startup; push mechanisms add infrastructure complexity without confirmed need in V1.*

## User Roles & Permissions

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| Human Orchestrator (web UI) | All read and write operations across all modules | Nothing is restricted |
| AI Agent (MCP) | All read and write operations across all modules | Nothing is restricted |

*The utility is deliberately participant-neutral. Human and agents are structurally equal. Who does what and when is governed by the layer above the utility.*

## Key Assumptions

- [ ] MCP is the right protocol for agent-to-utility communication and will remain stable enough for V1
- [ ] A local web server (no cloud hosting) is a sufficient interface for personal use
- [ ] AI agents reliably read state from the utility at session startup — this is a behavioral contract external to the utility itself
- [ ] Operational artifacts (statuses, reports, session results) can be cleanly separated from stable project documents (code, architecture files) that remain in git
- [ ] The utility's value is proven when the orchestrator stops receiving git diffs for routine agent operations

## Risks & Mitigations

| Risk | Type | Likelihood | Impact | Mitigation |
|------|------|------------|--------|------------|
| Split-brain during migration: some state in files, some in the utility | Adoption | High | High | Define a clear migration sequence — agree which artifact types move first before starting; do not mix sources for the same artifact type |
| MCP protocol evolves and breaks the agent interface | Technical | Low | High | Abstract the MCP layer so protocol changes don't ripple into the data model |
| Web UI scope expands beyond utility operations into workflow management | Business | Medium | Medium | Lock V1 UI scope to exactly the operations defined in the data model — no workflow views, dashboards, or automation controls |
| Agents write malformed or out-of-dictionary values, corrupting state | Technical | Medium | Medium | Dictionary validation at write time (already a design principle) |

## Success Metrics

- **Primary**: 100% of operational artifacts — task statuses, implementation reports, session start/result records — stored in the utility rather than the git repository within 4 weeks of deployment
- **Consequence**: zero required git diff approvals for routine agent state mutations (status changes, report writes, session updates)
- **Baseline**: currently, every agent state mutation requires orchestrator approval via git review

## Out of Scope for V1

- **Automated migration from markdown** — Deferred because the utility must prove its value before investing in tooling to import historical data. Revisit in V2 once steady-state usage is established.
- **Team distribution / multi-user** — Deferred because V1 is single-orchestrator. Revisit when there is a concrete second user.
- **Event-driven notifications** — Deferred because the pull-on-startup pattern is sufficient for the current agent design. Revisit if agents need real-time triggers.
- **Test run history as a first-class entity** — Open question (from source document): current model uses task type "testing task" + attachments for results. A dedicated "run" entity may be needed later for regression analysis; deferred until need is confirmed. If built, it would follow the same project-anchoring pattern confirmed for Sessions (SESSION-018) — scoped to a project, reachable independent of any single module's view.

## Open Questions

- [ ] **Migration sequence**: which artifact types move first — stories and tasks only, or sessions too? Needs a decision before the first agent starts writing to the utility.
- [ ] **Web UI scope for V1**: full CRUD for all operations, or read + status-update sufficient for the orchestrator's day-to-day? Answer affects UI implementation scope.
- [ ] **Storage medium**: the document specifies portability but not the physical mechanism. Decision belongs to architecture phase, but the product constraint is: must work on a single developer machine without external services.
