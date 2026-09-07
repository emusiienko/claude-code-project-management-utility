<!-- Default format for Repo-level ADR files — accept as-is or customize with lead-developer during Step 0 (Confirm Artifact Formats). One file per decision, scoped to this repo only, e.g. ADR-001-choose-validation-library.md. Numbers sequential within this repo — separate from architect's project-level ADRs. -->

**ADR IMMUTABILITY RULE**: ADRs are permanent records. Once created, the body of an ADR is NEVER edited. The ONLY permitted change to an existing ADR is updating its `Status` field to `Superseded by ADR-NNN`. If a decision changes, create a NEW ADR with the revised decision and mark the old one superseded.

```
# ADR-NNN: <Title>

**Date**: YYYY-MM-DD
**Status**: Accepted | Superseded by ADR-NNN
**Decision**: What was decided
**Options Considered**: List of alternatives evaluated
**Rationale**: Why this choice
**Trade-offs**: What we give up
```
