<!-- Default format for the Technical Implementation Plan artifact — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Part of Architectural Design (Phase 1 — Scope Planning) — see architectural-design-format.md. Business priorities and effort estimates are input the user supplies; this artifact adds only technical ordering — what must be built before what, for technical reasons. Where a stated business priority conflicts with a technical dependency, surface the conflict with options for the user's decision — never silently reorder or silently comply. Milestones are a separate artifact (see sdlc > Milestones, owned by the orchestrator) — not duplicated here. -->

# Technical Implementation Plan

```yaml
work_items:
  - id: string                  # e.g. STORY-014, or a sub-item within one
    title: string
    depends_on: [string]        # ids of work items that must complete first, for technical reasons
    related_adrs: [ADR-NNN]     # (optional) Planned or Accepted decisions this work item touches

risks:
  - description: string
    affects: [string]           # work item ids
    mitigation: string          # (optional)
```

## Summary
Human-readable: the technical ordering in prose, and any conflict between a stated business priority and a technical dependency — with options, for the user to decide. Never silently reorder around a conflict, never silently comply with a priority that breaks a dependency.
