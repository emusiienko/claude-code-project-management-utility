# architect — References

Locations of the artifacts I own are recorded in
[`fast-sdlc-project-setup.md`](../../../fast-sdlc-project-setup.md) > Artifacts (Architecture, API
Contract, Architectural Design, Story Implementation Plan); their formats are the plugin default
templates in this folder, used as-is ([`architecture/`](architecture/),
[`architectural-design/`](architectural-design/),
[`api-contract-format.md`](api-contract-format.md), [`adr-format.md`](adr-format.md),
[`persistence-map-format.md`](persistence-map-format.md),
[`story-implementation-plan-format.md`](story-implementation-plan-format.md),
[`claude-md-format.md`](claude-md-format.md)). Only the two decisions below have no home in either
place.

## ADR Log
- **Location**: [`documentation/technical/adr-log/`](../../../documentation/technical/adr-log/);
  format [`adr-format.md`](adr-format.md) in this folder.
- **Numbering**: sequential across the whole project — check the folder for the next id before
  assigning one.

## Physical Data Model — format per storage platform
- **Relational, single DB-agnostic store (PostgreSQL / SQLite)**: per-table column tables
  (Column | Type | Constraints/Notes) + Relations & Cascade + Indexes + Portability Constraints
  (SQLite ⇄ PostgreSQL) + Seed Data. No per-platform template ships by default, so this registration
  is the record of the settled format.
- A new storage platform needs its own format confirmed with the user before any model is produced
  for it, then registered here.
