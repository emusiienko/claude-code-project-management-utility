<!--
Requirements — what's still to be done. Everything already built lives in Business Documentation
(documentation/business/), kept true after the fact. This folder only ever holds pending scope that
has actually been commissioned; once a feature described here ships and is reconciled, it moves out
of here into Business Documentation.
-->

# Requirements — Index

## Feature List
| Feature | File | Description | Priority | Access |
|---------|------|-------------|----------|--------|

No pending scope as of this writing. Session Deletion (STORY-008/TASK-021) shipped, was `Accepted`,
and moved out of here into Business Documentation at Reconcile (STORY-008/TASK-021, 2026-09-19) — not
as its own capability file, but folded as brief notes into the existing Sessions capability
description (`documentation/business/sessions.md`). Resizable Panel Layouts (STORY-006/TASK-001)
shipped, was `Accepted`, and moved out of here into Business Documentation at Reconcile
(STORY-006/TASK-022, 2026-09-13) — not as its own capability file, but folded as brief notes into the
existing descriptions of the screens it affects (`documentation/business/stories.md`'s Story Detail
split, `documentation/business/sessions.md`'s project-selector sidebar). Everything else already
built lives in Business Documentation (see below); this folder only ever holds pending scope that has
actually been commissioned.

Two known product limitations were found while migrating the prior process's requirements documents
(a Web UI control that doesn't work end-to-end; a Web UI screen that's still a placeholder) — by
explicit decision, these are **not** tracked here as active Requirements, since nobody has yet
decided to commission the work. They are noted as known limitations in the relevant Business
Documentation files instead (`documentation/business/settings.md`,
`documentation/business/cross-project-queries.md`). The second one turned out, at STORY-001
Reconcile, to be a bigger gap than originally described — see that file for the corrected scope
(the whole cross-project read capability is unbuilt, not just its Web UI screen). If/when the user
decides to commission either, it re-enters this folder as a proper feature file at that time.
