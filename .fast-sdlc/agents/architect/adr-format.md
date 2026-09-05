<!-- Default format for ADR Log files — accept as-is or customize with architect during Step 0 (Confirm Artifact Formats). Part of the Architecture folder (Technical Documentation). One file per decision, e.g. ADR-001-choose-auth-library.md. Numbers sequential across the entire project. -->

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
