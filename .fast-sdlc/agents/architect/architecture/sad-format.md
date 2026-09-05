<!-- Default format for the SAD (Software Architecture Document) — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). The master/entry document of the Architecture folder (Technical Documentation). Thin, arc42-skeleton: inlines only what gives a readable whole and is small — C4 diagrams, a key-decisions summary, an NFR summary, connecting prose. References the bulky live artifacts (Solution Overview's own graphs, Data Models, API Contracts, ADR Log, Deployment/Infrastructure View) rather than copying them, so it stays current when they change. Assembled/kept current at every Reconcile; a fuller pass happens at milestone boundaries. -->

# Software Architecture Document

## Introduction & Goals
1–2 paragraphs: what this system does and why, plus its top quality goals — pointers into NFR, not a restatement.

## System Scope & Context
References Solution Overview's System Context (C4 Level 1) — inline the diagram, don't restate the prose.

## Solution Strategy
A few sentences on the overall technical approach and the most consequential decisions — each one a pointer to its ADR Log entry by ID, never restated.

## Building Block View
References Solution Overview's Key Components (C4 Level 2) — inline the diagram, don't restate the prose.

## Runtime View
1–2 key flows, referencing Solution Overview's Data Flow subsection rather than repeating it in full.

## Deployment View
References the Deployment/Infrastructure View artifact if one exists on this project; otherwise a pointer to Solution Overview's deployment-topology fallback subsection.

## Quality Requirements
A short NFR summary table (Category + Target only) — full detail, Source, and Notes stay in NFR itself.

## Architecture Decisions
A table of ADR Log entries: ID, title, status. No rationale or trade-offs here — those live in each ADR file.

## Risks & Technical Debt
Known risks and debt not already covered by an ADR — brief, prose.
