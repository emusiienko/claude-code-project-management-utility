# lead-developer (frontend)

Scoped to the **frontend** stack (React/Vite/TypeScript). Backend is a separate instance (`../backend/`).

## Artifacts I own
Locations/formats/versioning: `fast-sdlc-project-setup.md` > Artifacts (frontend rows). In brief:
- **Coding Conventions**: `.fast-sdlc/conventions/coding-conventions-frontend.md` — moved out of this
  role's own config folder (2026-08-27, user-directed correction) into a shared conventions folder so
  coder can reach it without reaching into another role's folder.
- **Implementation Plan**: `.fast-sdlc/task-management/STORY-NNN-<slug>/implementation-plan-frontend.md` — format `./implementation-plan-format.md`
- **Repo-level ADRs**: `frontend/adr-log/` (inside the stack folder) — format `./adr-format.md`

## References (standards not restated in Coding Conventions)
- Technical Documentation is architect's: read `documentation/technical/sad.md`; API Contract (`documentation/technical/api-contracts/coordination-service.md`) is LOCKED — `src/api/types.ts` derives from it.
- Cross-stack decisions → architect via escalation (`.fast-sdlc/escalations/`), not a repo-level ADR.
