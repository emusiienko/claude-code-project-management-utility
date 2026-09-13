<!-- Default format for the Implementation Plan artifact — accept as-is or customize with lead-developer during Step 0 (Confirm Artifact Formats). One per story, created in Plan Implementation mode. No tables — bullets and prose only. State every choice as a direct claim with its reason — never build up to a decision narratively, never use a framing device to introduce a set of points. -->

# Implementation Plan: STORY-NNN — <Story Title>

## Scope

- <what this story touches> — <one-line reason>.
- <what this story touches> — <one-line reason>.
  e.g. "the resizable border between the Sessions list and Session detail panels — the only two panels sharing an edge in the default shell."
...

## Decisions
- <Decision> — because <reason>.
- Not <alternative> — because <reason>. (include only when an alternative was genuinely weighed)

## Ordered Tasks
Sequential, dependency-ordered list matching the task files. Each entry: a descriptive title, and what's to be done, tied to the project's actual module/package structure — concrete, not abstract, without rationale or detail.

1. TASK-001: <title> — <module/package> — <what changes>
2. TASK-002: <title> (depends on TASK-001) — <module/package> — <what changes>

## Planned ADRs
Decisions likely to need an ADR once implementation confirms them. Architect creates the actual ADR file at Reconcile — this is only the trigger condition, for architect's awareness.

- <decision area> — trigger: <condition, e.g. "if async processing is required">

## Constraints & Gotchas
Cross-cutting only — a constraint or pitfall that spans more than one task (e.g. "the whole feature must stay keyboard accessible"). A single task's own pitfall belongs in that task's file.
