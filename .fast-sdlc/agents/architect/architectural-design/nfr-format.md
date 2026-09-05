<!-- Default format for the NFR (non-functional requirements) artifact — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). The same content serves both lifecycle stages: a draft, part of Architectural Design (Phase 1 — Scope Planning, see architectural-design-format.md); and the as-built version living inside the Architecture folder (Technical Documentation). Formalizes business-analyst's business-stated non-functional needs (Requirements' non-functional.md) into measurable targets; cross-references back to Requirements rather than restating the business rationale. What justifies a "technical" (non-business) addition in a Physical Data Model (see architect's DATA MODELING). Carrier depends on scale: this content as a section inside Solution Overview on a small project, or this separate file on a larger one — either is valid, confirm which during Step 0. -->

# NFR — Non-Functional Requirements

One entry per requirement:

```markdown
### <Short title>
**Category**: performance | availability | security | privacy | regulatory | other
**Target**: measurable — e.g. "p95 API latency < 300ms", "99.9% uptime", "encrypt data at rest"
**Source**: pointer to the Requirements line that raised this, in business language
**Notes**: (optional) anything a physical/infrastructure decision downstream needs to know
```

Do not restate the business rationale here — that's in Requirements, via **Source**. This artifact exists to make the target measurable, not to re-argue why it matters.
