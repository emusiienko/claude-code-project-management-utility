---
session: SESSION-023
agent: product-strategist
status: completed
---

## Briefing
**Goal**: Validate the user's idea of adding a new top-level `agents`/`skills` folder to this repository, separate from the existing `backend/` and `frontend/` folders, before any technical scoping begins.

**Context**: This is the "Add Scope" flow (Phase 1). The user said, verbatim: "I want to add agents/skills folder here, separately from backend and frontend. I would like to validate this idea." No further detail has been given yet — that's for this session to draw out.

**Topics**:
- What problem the user is trying to solve by having this folder in the repo
- What would live in it, and how it differs from `backend/`/`frontend/` in purpose and audience
- IN/OUT scope boundaries for this idea

---

## Report

**Decisions made**:
- The `agents`/`skills` folder idea is **not** a feature of the AI Agent Coordination Utility — it is a **separate product**, named **"Fast SDLC"**, with its own problem statement, beneficiary, and value proposition. It depends on the coordination utility as a tool (state backend), the same way it currently depends on the filesystem.
- Per this pipeline's convention (one repo → one product → one validated-idea document lineage, as with RPAC_back/RPAC-UI), Fast SDLC gets its own repository rather than living inside `claude-code-project-management`. The user created it at `/Users/Evgeniy/Work/pet/fast-sdlc`.
- Fast SDLC's full vision spans 3 sequential phases: (1) relocate agent/skill definitions from global, untracked local config into the repo, integrated with the existing task manager; (2) Docker-based isolated execution for safe parallel story work; (3) PR-based validation and approval workflow.
- **This document validates Phase 1 only** as the MVP. Phases 2 and 3, plus plugin/deployment packaging, are explicitly OUT of scope for this version, with rationale tied to the phase sequencing.
- North Star success metric (achieved only once all 3 phases exist): scope 3–4 stories, agents work autonomously in parallel, return same day to 3–4 open pull requests ready for manual per-branch testing and merge. Phase 1's own success criterion is narrower: definitions relocated and working with no regression.
- Output written to `/Users/Evgeniy/Work/pet/fast-sdlc/docs/validated-business-idea/latest.md` and `changelog.md` (initial version).

**Open questions**:
- Packaging/distribution mechanism (plugin vs. script vs. manual copy) — undecided.
- Target timeframe for reaching the North Star metric — not yet set.
- Transition management: will global (`~/.claude/agents`, `~/.claude/skills`) and repo-hosted definitions run side by side, and for how long?
- Repo/monorepo execution topology relative to the AI Agent Coordination Utility — deferred to architecture.

**Summary**: Discovery revealed the user's "add an agents/skills folder" request was actually a new, independent product idea (an evolvable, versioned agentic SDLC framework) rather than a feature of the existing coordination utility. Scoped it down from an all-at-once vision (subagents + orchestration + Docker + PR validation) to a tightly bounded Phase 1 MVP, and produced the initial Validated Idea document for "Fast SDLC" in its new dedicated repository.
