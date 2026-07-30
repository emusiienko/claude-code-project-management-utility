---
status: Pending Approval
type: fix
priority: P0
date: 2026-07-30
---

# STORY-023: Sessions List 500s — Stale `session` Schema Drift From In-Place Migration Edit

## Desired Outcome
`GET /v1/sessions` (and the Sessions list screen) loads without error on any
environment, regardless of whether that environment's database first applied
the original (pre-`is_complete`-removal) version of `0013_session` or the
amended one, and `alembic upgrade head` alone is sufficient to converge any
such environment to the correct schema.

## Context
STORY-009 TASK-008 changed `session.status` from a nullable free-form string
to a mandatory 3-value enum (`pending`/`in-progress`/`finished`), amending
migration `0013_session.py` **in place** (same revision id) instead of adding
a new migration — reasoned as safe because the `session` table only existed
on this unmerged feature branch.

That assumption didn't hold for this running dev stack: a manual-QA pass
exercised real Create Session actions through the UI *before* the TASK-008
rework landed, against the *original* `0013_session` (which created an
`is_complete` boolean and a nullable, no-default `status` column). That run's
`alembic_version` row is pinned at `0013_session` — Alembic tracks revision
ids, not migration content, so `alembic upgrade head` against that database
is a no-op; the amended `upgrade()` never re-runs. The `session` table kept
`is_complete` and every pre-existing row's `status` stayed `NULL`, which
crashes `GET /v1/sessions` with a Pydantic `ValidationError` (`status` is a
mandatory field) — reported live after `./deploy.sh rebuild`.

## Acceptance Criteria
- [x] Root cause identified: `alembic_version` pinned at `0013_session` from a
      pre-TASK-008 apply, so the amended `0013_session.py` content never ran
      against this database; the live `session` table still has `is_complete`
      and a nullable `status` with no default.
- [x] A new corrective Alembic migration (not another in-place edit of
      `0013_session`) backfills any `NULL` `status` to `"pending"`, tightens
      `status` to `NOT NULL DEFAULT 'pending'`, drops `is_complete`, and
      replaces `ix_session_project_complete` with `ix_session_project_status`
      — conditioned on detecting the stale shape, so it is a true no-op on a
      database that only ever saw the current `0013_session`.
- [x] Verified against a reproduction of the exact drift (pre-`0013` state +
      manually recreated old schema + `alembic_version` stamped at
      `0013_session`): a single `alembic upgrade head` run converges the
      schema correctly.
- [x] Full backend test suite passes with no regressions.
- [x] Running Docker stack's stale manual-QA session rows (24 rows, none
      real data — `Bulk session 01..18`, `Filter A/B`, etc.) removed directly
      from the database; `GET /v1/sessions` confirmed 200 with an empty list,
      and a fresh `POST /v1/sessions` + list round-trip confirmed 201/200.
- [ ] Running Docker stack rebuilt by the user (`./deploy.sh rebuild`) so the
      backend image picks up the new migration file; the entrypoint's
      `alembic upgrade head` then applies it, fully converging the live
      table's schema (drop `is_complete`, tighten `status`, fix index) — not
      required to unblock the Sessions list (already confirmed working after
      the data cleanup above) but required to close the schema drift itself.

## Edge Cases & Error Scenarios
- [x] A completely fresh install (no `session` table, or one created only by
      the current `0013_session`) — the new migration must no-op cleanly,
      verified via the full test suite (all fixtures build a fresh test DB
      from scratch every session) and the reproduction script.
- [x] Downgrading past `0013_session` (which drops the whole table) must
      still work — the new migration's `downgrade()` is a deliberate no-op
      documented as such, since there's no reliable signal to invert on and
      every downgrade path this repo tests goes on to drop the table anyway.
