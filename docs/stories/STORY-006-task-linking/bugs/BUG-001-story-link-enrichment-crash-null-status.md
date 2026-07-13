---
id: BUG-001
story: STORY-006
severity: major
status: resolved
assignee: backend-developer
---

# BUG-001: Story link enrichment crashes with 500 when linked story has no status

## Description

`GET /v1/stories/:storyId/links` and `GET /v1/stories/:storyId/detail` return HTTP 500 when any linked story has `status = null` (which is a valid state — story status is optional). The crash originates in `StoryLinkService._enrich_links()` when constructing `LinkedStorySummary`: the schema declares `status: str` (non-nullable) but `story.status` is `Mapped[str | None]` in the ORM model.

The same field in `LinkedTaskSummary` (for task links) is correctly non-nullable because `task.status` is `nullable=False` at the DB level. The mismatch is only in the story-link schema.

## Steps to Reproduce

1. Create a project and two stories **without setting a status** on either story.
2. Create a story link between them: `POST /v1/stories/{story_a_id}/links`
   ```json
   {"target_story_id": "<story_b_id>", "link_type": "depends-on"}
   ```
3. List links: `GET /v1/stories/{story_a_id}/links`

## Expected Result

HTTP 200 with the link list; `linked_story.status` should be `null` (the story has no status set).

## Actual Result

HTTP 500 — Pydantic `ValidationError`:

```
pydantic_core._pydantic_core.ValidationError: 1 validation error for LinkedStorySummary
status
  Input should be a valid string [type=string_type, input_value=None, input_type=NoneType]
```

## Fix

In `backend/app/story_links/schema.py`, change `LinkedStorySummary.status` from `str` to `str | None`:

```python
class LinkedStorySummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str | None   # was: str
```

The same fix is needed for `EnrichedStoryLink` if `status` appears there directly (it does not — it nests `LinkedStorySummary`, so only the one change is needed).

## Additional Info

- Test that reproduces the bug: `test_story_links.py::TestListStoryLinks::test_enrichment_with_null_story_status_returns_200` (marked `xfail` until this is fixed)
- Automated test suite: `backend/tests/test_story_links.py`
- Affected files: `backend/app/story_links/schema.py` (line ~16)
- Also affects `GET /v1/stories/:id/detail` via `StoryService.get_detail()` which calls `story_link_reader.list_all_enriched_for_story()`
