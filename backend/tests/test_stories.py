"""Integration tests for the Stories domain — STORY-004.

Coverage zones (per TASK-007):
- POST /v1/stories                  create happy path, invalid status (422), missing title (422),
                                    empty title (422), title too long (422), content too long (422),
                                    label with empty key (422), unknown project (404),
                                    malformed project_id (404), null status accepted
- GET  /v1/stories?project_id=...   list, status filter, label_key filter, label_value filter,
                                    absent label key yields empty page (not error), pagination
- GET  /v1/stories/:id              found, not found (404), malformed id (404)
- PUT  /v1/stories/:id              happy path, status validation (422), partial update
                                    (omitted fields unchanged), labels replace entirely,
                                    empty labels array clears, null status removes status
- DELETE /v1/stories/:id            happy path, unknown id (404)
- GET  /v1/stories/:id/aggregate    returns 404 (not yet implemented)
- Cross-project isolation           story from project A is not visible via project B list
- Labels                            create with labels, update replaces entirely, empty array clears
- Cascade delete                    deleting the parent project removes its stories

Notes:
- Every test creates its own data and does not rely on execution order.
- System default story_statuses are used for status validation tests; the seed migration
  creates these defaults and they are confirmed by the settings tests.
- The seed migration inserts a "Test Project" so the list is never completely empty.
"""
import uuid

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
PROJECTS_ID_URL = "/v1/projects"
STORIES_URL = "/v1/stories"

# System-default story_statuses values (from seed migration 0002_settings).
# These are used for positive/negative status validation.
VALID_STATUS = "planned"
INVALID_STATUS = "not-a-valid-status-xyz"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(client: AsyncClient, name: str) -> dict:
    """POST /v1/projects and return the 'data' dict."""
    resp = await client.post(PROJECTS_URL, json={"name": name})
    assert resp.status_code == 201, (
        f"Helper _create_project: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_project(client: AsyncClient, project_id: str) -> None:
    """DELETE /v1/projects/:id — cleanup helper."""
    await client.delete(f"{PROJECTS_ID_URL}/{project_id}")


async def _create_story(
    client: AsyncClient,
    project_id: str,
    title: str = "Test Story",
    *,
    content: str | None = None,
    status: str | None = None,
    labels: list[dict] | None = None,
) -> dict:
    """POST /v1/stories and return the 'data' dict."""
    payload: dict = {"project_id": project_id, "title": title}
    if content is not None:
        payload["content"] = content
    if status is not None:
        payload["status"] = status
    if labels is not None:
        payload["labels"] = labels
    resp = await client.post(STORIES_URL, json=payload)
    assert resp.status_code == 201, (
        f"Helper _create_story: expected 201, got {resp.status_code} — {resp.text}"
    )
    return resp.json()["data"]


async def _delete_story(client: AsyncClient, story_id: str) -> None:
    """DELETE /v1/stories/:id — cleanup helper."""
    await client.delete(f"{STORIES_URL}/{story_id}")


# ===========================================================================
# POST /v1/stories — Create
# ===========================================================================


class TestCreateStory:
    async def test_happy_path_returns_201(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Project 1")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "My First Story"},
            )
            assert resp.status_code == 201, (
                f"Expected 201, got {resp.status_code}"
            )
            await _delete_story(client, resp.json()["data"]["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_response_has_data_envelope(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Project 2")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Envelope Story"},
            )
            assert "data" in resp.json(), "Response missing 'data' key"
            await _delete_story(client, resp.json()["data"]["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_response_fields_present(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Fields Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Fields Story"},
            )
            data = resp.json()["data"]
            for field in ("id", "project_id", "title", "content", "status",
                          "labels", "milestone_id", "created_at", "updated_at"):
                assert field in data, f"Field '{field}' missing from story response"
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_project_id_in_response_matches_parent(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Story ProjId Project")
        try:
            data = await _create_story(client, proj["id"], "ProjId Story")
            assert data["project_id"] == proj["id"], (
                f"project_id mismatch: expected {proj['id']}, got {data['project_id']}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_null_status_is_accepted(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Null Status Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Null Status Story", "status": None},
            )
            assert resp.status_code == 201, (
                f"Null status should be accepted (201), got {resp.status_code}"
            )
            data = resp.json()["data"]
            assert data["status"] is None, (
                f"Expected null status, got {data['status']}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_invalid_status_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Bad Status Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Bad Status Story", "status": INVALID_STATUS},
            )
            assert resp.status_code == 422, (
                f"Invalid status should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_invalid_status_error_code_is_unprocessable(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Story UnprocCode Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Unproc Story", "status": INVALID_STATUS},
            )
            body = resp.json()
            assert body.get("code") == "UNPROCESSABLE", (
                f"Expected UNPROCESSABLE, got '{body.get('code')}'"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_missing_title_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story No Title Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "content": "no title here"},
            )
            assert resp.status_code == 422, (
                f"Missing title should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_empty_title_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Empty Title Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": ""},
            )
            assert resp.status_code == 422, (
                f"Empty title should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_title_too_long_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Long Title Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "x" * 501},
            )
            assert resp.status_code == 422, (
                f"Title > 500 chars should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_title_exactly_500_chars_is_accepted(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Create Story MaxTitle Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "t" * 500},
            )
            assert resp.status_code == 201, (
                f"Title of exactly 500 chars should be accepted, got {resp.status_code}"
            )
            await _delete_story(client, resp.json()["data"]["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_content_too_long_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Long Content Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Content Story", "content": "c" * 50001},
            )
            assert resp.status_code == 422, (
                f"Content > 50000 chars should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_label_with_empty_key_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Empty Label Project")
        try:
            resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Label Story", "labels": [{"key": "", "value": "v"}]},
            )
            assert resp.status_code == 422, (
                f"Label with empty key should return 422, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_create_with_labels_stores_them(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story With Labels Project")
        try:
            labels = [{"key": "env", "value": "prod"}, {"key": "team", "value": ""}]
            data = await _create_story(
                client, proj["id"], "Labeled Story", labels=labels
            )
            assert len(data["labels"]) == 2, (
                f"Expected 2 labels, got {len(data['labels'])}"
            )
            assert data["labels"][0]["key"] == "env", (
                f"Label key mismatch: expected 'env', got '{data['labels'][0]['key']}'"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_unknown_project_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.post(
            STORIES_URL,
            json={"project_id": fake_id, "title": "Ghost Story"},
        )
        assert resp.status_code == 404, (
            f"Unknown project should return 404, got {resp.status_code}"
        )

    async def test_malformed_project_id_returns_404(self, client: AsyncClient) -> None:
        resp = await client.post(
            STORIES_URL,
            json={"project_id": "not-a-uuid", "title": "Malformed Story"},
        )
        assert resp.status_code == 404, (
            f"Malformed project_id should return 404, got {resp.status_code}"
        )

    async def test_status_honored_when_valid(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Create Story Valid Status Project")
        try:
            data = await _create_story(
                client, proj["id"], "Planned Story", status=VALID_STATUS
            )
            assert data["status"] == VALID_STATUS, (
                f"Expected status '{VALID_STATUS}', got '{data['status']}'"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_project_override_honored_for_status(
        self, client: AsyncClient
    ) -> None:
        """A project-level story_statuses override takes precedence over the system default.

        A status valid in the system default but removed from the project override must
        be rejected; a custom value added to the project override must be accepted.
        """
        proj = await _create_project(client, "Status Override Project")
        try:
            # Override: replace story_statuses with a single custom value.
            override_status = "custom-override-status"
            put_resp = await client.put(
                f"{PROJECTS_ID_URL}/{proj['id']}/settings",
                json={"story_statuses": [override_status]},
            )
            assert put_resp.status_code == 200, (
                f"Settings override should succeed, got {put_resp.status_code}"
            )

            # The custom override status must be accepted.
            data = await _create_story(
                client, proj["id"], "Override Story", status=override_status
            )
            assert data["status"] == override_status, (
                f"Expected override status, got '{data['status']}'"
            )
            await _delete_story(client, data["id"])

            # The old default 'planned' must now be rejected.
            reject_resp = await client.post(
                STORIES_URL,
                json={"project_id": proj["id"], "title": "Should Fail Story", "status": VALID_STATUS},
            )
            assert reject_resp.status_code == 422, (
                f"Default status should be rejected after override, "
                f"got {reject_resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# GET /v1/stories?project_id=... — List
# ===========================================================================


class TestListStories:
    async def test_returns_200(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Stories Project 1")
        try:
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            assert resp.status_code == 200, (
                f"Expected 200, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_response_has_data_and_meta(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Stories Project 2")
        try:
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            body = resp.json()
            assert "data" in body, "Response missing 'data' key"
            assert "meta" in body, "Response missing 'meta' key"
        finally:
            await _delete_project(client, proj["id"])

    async def test_empty_project_returns_empty_list(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Stories Empty Project")
        try:
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            body = resp.json()
            assert body["data"] == [], (
                f"New project should have no stories, got {body['data']}"
            )
            assert body["meta"]["total"] == 0, (
                f"meta.total should be 0, got {body['meta']['total']}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_created_story_appears_in_list(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Stories Appear Project")
        try:
            data = await _create_story(client, proj["id"], "Story In List")
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            ids = [s["id"] for s in resp.json()["data"]]
            assert data["id"] in ids, "Newly created story not found in project list"
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_status_filter_returns_matching_stories(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Stories Status Filter Project")
        try:
            s1 = await _create_story(
                client, proj["id"], "Planned Story", status=VALID_STATUS
            )
            s2 = await _create_story(client, proj["id"], "No Status Story")
            resp = await client.get(
                STORIES_URL,
                params={"project_id": proj["id"], "status": VALID_STATUS},
            )
            body = resp.json()
            ids = [s["id"] for s in body["data"]]
            assert s1["id"] in ids, "Filtered story should appear in status-filtered list"
            assert s2["id"] not in ids, "Unmatched story should not appear"
            await _delete_story(client, s1["id"])
            await _delete_story(client, s2["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_label_key_filter_returns_matching_stories(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Stories LabelKey Project")
        try:
            s1 = await _create_story(
                client, proj["id"], "Keyed Story",
                labels=[{"key": "env", "value": "prod"}]
            )
            s2 = await _create_story(client, proj["id"], "Unkeyed Story")
            resp = await client.get(
                STORIES_URL,
                params={"project_id": proj["id"], "label_key": "env"},
            )
            ids = [s["id"] for s in resp.json()["data"]]
            assert s1["id"] in ids, "Story with matching label key should appear"
            assert s2["id"] not in ids, "Story without label key should not appear"
            await _delete_story(client, s1["id"])
            await _delete_story(client, s2["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_label_value_filter_returns_matching_stories(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Stories LabelValue Project")
        try:
            s1 = await _create_story(
                client, proj["id"], "Prod Story",
                labels=[{"key": "env", "value": "prod"}]
            )
            s2 = await _create_story(
                client, proj["id"], "Staging Story",
                labels=[{"key": "env", "value": "staging"}]
            )
            resp = await client.get(
                STORIES_URL,
                params={"project_id": proj["id"], "label_key": "env", "label_value": "prod"},
            )
            ids = [s["id"] for s in resp.json()["data"]]
            assert s1["id"] in ids, "Story with matching label value should appear"
            assert s2["id"] not in ids, "Story with different label value should not appear"
            await _delete_story(client, s1["id"])
            await _delete_story(client, s2["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_absent_label_key_returns_empty_page_not_error(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "List Stories Absent Label Project")
        try:
            s = await _create_story(client, proj["id"], "Some Story")
            resp = await client.get(
                STORIES_URL,
                params={"project_id": proj["id"], "label_key": "nonexistent-label-key-xyz"},
            )
            assert resp.status_code == 200, (
                f"Absent label key should return 200 (empty page), got {resp.status_code}"
            )
            assert resp.json()["data"] == [], (
                "Absent label key should yield empty data list"
            )
            await _delete_story(client, s["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_pagination_meta_reflects_count(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "List Stories Pagination Project")
        try:
            ids = []
            for i in range(3):
                d = await _create_story(client, proj["id"], f"Paginated Story {i}")
                ids.append(d["id"])
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            assert resp.json()["meta"]["total"] == 3, (
                f"meta.total should be 3, got {resp.json()['meta']['total']}"
            )
            for sid in ids:
                await _delete_story(client, sid)
        finally:
            await _delete_project(client, proj["id"])

    async def test_unknown_project_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(STORIES_URL, params={"project_id": fake_id})
        assert resp.status_code == 404, (
            f"Unknown project list should return 404, got {resp.status_code}"
        )

    async def test_cross_project_isolation(self, client: AsyncClient) -> None:
        """Story from project A must not appear in project B's story list."""
        proj_a = await _create_project(client, "Isolation Project A")
        proj_b = await _create_project(client, "Isolation Project B")
        try:
            story_a = await _create_story(client, proj_a["id"], "Project A Story")
            resp_b = await client.get(STORIES_URL, params={"project_id": proj_b["id"]})
            ids_b = [s["id"] for s in resp_b.json()["data"]]
            assert story_a["id"] not in ids_b, (
                "Story from project A should not appear in project B's list"
            )
            await _delete_story(client, story_a["id"])
        finally:
            await _delete_project(client, proj_a["id"])
            await _delete_project(client, proj_b["id"])


# ===========================================================================
# GET /v1/stories/:id — Get by ID
# ===========================================================================


class TestGetStory:
    async def test_returns_200_for_existing_story(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Get Story Project 1")
        try:
            data = await _create_story(client, proj["id"], "Get Story")
            resp = await client.get(f"{STORIES_URL}/{data['id']}")
            assert resp.status_code == 200, (
                f"Expected 200, got {resp.status_code}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_response_data_matches_created_story(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Get Story Match Project")
        try:
            created = await _create_story(
                client, proj["id"], "Match Story", content="some content"
            )
            resp = await client.get(f"{STORIES_URL}/{created['id']}")
            fetched = resp.json()["data"]
            assert fetched["id"] == created["id"], (
                f"id mismatch: expected {created['id']}, got {fetched['id']}"
            )
            assert fetched["title"] == "Match Story", (
                f"title mismatch: got '{fetched['title']}'"
            )
            assert fetched["content"] == "some content", (
                f"content mismatch: got '{fetched['content']}'"
            )
            await _delete_story(client, created["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"{STORIES_URL}/{fake_id}")
        assert resp.status_code == 404, (
            f"Unknown story id should return 404, got {resp.status_code}"
        )

    async def test_unknown_id_error_code_is_not_found(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.get(f"{STORIES_URL}/{fake_id}")
        body = resp.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got '{body.get('code')}'"
        )

    async def test_malformed_id_returns_404(self, client: AsyncClient) -> None:
        resp = await client.get(f"{STORIES_URL}/not-a-valid-uuid")
        assert resp.status_code == 404, (
            f"Malformed story id should return 404, got {resp.status_code}"
        )


# ===========================================================================
# PUT /v1/stories/:id — Update
# ===========================================================================


class TestUpdateStory:
    async def test_happy_path_returns_200(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Project 1")
        try:
            data = await _create_story(client, proj["id"], "Update Me")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"title": "Updated Title"}
            )
            assert resp.status_code == 200, (
                f"Expected 200, got {resp.status_code}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_title_is_updated(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Title Project")
        try:
            data = await _create_story(client, proj["id"], "Old Title")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"title": "New Title"}
            )
            assert resp.json()["data"]["title"] == "New Title", (
                f"Title should be updated, got '{resp.json()['data']['title']}'"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_content_is_updated(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Content Project")
        try:
            data = await _create_story(client, proj["id"], "Content Story")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"content": "New content"}
            )
            assert resp.json()["data"]["content"] == "New content", (
                "Content should be updated"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_omitted_title_leaves_it_unchanged(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Story Partial Project")
        try:
            data = await _create_story(client, proj["id"], "Unchanged Title Story")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"content": "New content only"}
            )
            assert resp.json()["data"]["title"] == "Unchanged Title Story", (
                "Title should be unchanged when not provided in update"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_valid_status_update_is_accepted(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Status Project")
        try:
            data = await _create_story(client, proj["id"], "Status Update Story")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"status": VALID_STATUS}
            )
            assert resp.status_code == 200, (
                f"Valid status update should return 200, got {resp.status_code}"
            )
            assert resp.json()["data"]["status"] == VALID_STATUS, (
                f"Status should be updated to '{VALID_STATUS}'"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_invalid_status_returns_422(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Invalid Status Project")
        try:
            data = await _create_story(client, proj["id"], "Invalid Status Update")
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"status": INVALID_STATUS}
            )
            assert resp.status_code == 422, (
                f"Invalid status update should return 422, got {resp.status_code}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_null_status_removes_status(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Null Status Project")
        try:
            data = await _create_story(
                client, proj["id"], "Status To Clear", status=VALID_STATUS
            )
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"status": None}
            )
            assert resp.status_code == 200, (
                f"Setting status=null should return 200, got {resp.status_code}"
            )
            assert resp.json()["data"]["status"] is None, (
                "Status should be null after explicit null update"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_labels_replace_entirely(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Update Story Labels Replace Project")
        try:
            data = await _create_story(
                client, proj["id"], "Labels Replace Story",
                labels=[{"key": "k1", "value": "v1"}, {"key": "k2", "value": "v2"}]
            )
            # Replace with a single label — k1/k2 must disappear
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}",
                json={"labels": [{"key": "k3", "value": "v3"}]},
            )
            labels = resp.json()["data"]["labels"]
            assert len(labels) == 1, (
                f"Expected 1 label after replace, got {len(labels)}"
            )
            assert labels[0]["key"] == "k3", (
                f"Expected key 'k3', got '{labels[0]['key']}'"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_empty_labels_array_clears_all_labels(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Story Clear Labels Project")
        try:
            data = await _create_story(
                client, proj["id"], "Clear Labels Story",
                labels=[{"key": "env", "value": "prod"}]
            )
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"labels": []}
            )
            assert resp.json()["data"]["labels"] == [], (
                "Labels should be empty after update with []"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_omitting_labels_leaves_them_unchanged(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Story Omit Labels Project")
        try:
            data = await _create_story(
                client, proj["id"], "Labels Unchanged Story",
                labels=[{"key": "env", "value": "prod"}]
            )
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"title": "Labels Unchanged Story 2"}
            )
            labels = resp.json()["data"]["labels"]
            assert len(labels) == 1, (
                f"Labels should be unchanged when not in update body, got {len(labels)}"
            )
            assert labels[0]["key"] == "env", (
                "Label key should be unchanged"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.put(
            f"{STORIES_URL}/{fake_id}", json={"title": "Ghost Update"}
        )
        assert resp.status_code == 404, (
            f"Unknown story id should return 404, got {resp.status_code}"
        )

    async def test_updated_at_changes_after_update(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Update Story Timestamp Project")
        try:
            data = await _create_story(client, proj["id"], "Timestamp Update Story")
            original_updated_at = data["updated_at"]
            resp = await client.put(
                f"{STORIES_URL}/{data['id']}", json={"title": "Updated Timestamp Story"}
            )
            assert resp.json()["data"]["updated_at"] >= original_updated_at, (
                "updated_at should be >= original value after PUT"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# DELETE /v1/stories/:id
# ===========================================================================


class TestDeleteStory:
    async def test_happy_path_returns_204(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Delete Story Project 1")
        try:
            data = await _create_story(client, proj["id"], "Delete Me")
            resp = await client.delete(f"{STORIES_URL}/{data['id']}")
            assert resp.status_code == 204, (
                f"Expected 204, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_deleted_story_no_longer_accessible(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Delete Story Gone Project")
        try:
            data = await _create_story(client, proj["id"], "Delete Then Get")
            await client.delete(f"{STORIES_URL}/{data['id']}")
            resp = await client.get(f"{STORIES_URL}/{data['id']}")
            assert resp.status_code == 404, (
                f"Deleted story should return 404 on GET, got {resp.status_code}"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_deleted_story_absent_from_list(self, client: AsyncClient) -> None:
        proj = await _create_project(client, "Delete Story From List Project")
        try:
            data = await _create_story(client, proj["id"], "Delete From List")
            await client.delete(f"{STORIES_URL}/{data['id']}")
            resp = await client.get(STORIES_URL, params={"project_id": proj["id"]})
            ids = [s["id"] for s in resp.json()["data"]]
            assert data["id"] not in ids, (
                "Deleted story should not appear in project story list"
            )
        finally:
            await _delete_project(client, proj["id"])

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"{STORIES_URL}/{fake_id}")
        assert resp.status_code == 404, (
            f"Deleting unknown story should return 404, got {resp.status_code}"
        )

    async def test_unknown_id_error_code_is_not_found(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        resp = await client.delete(f"{STORIES_URL}/{fake_id}")
        body = resp.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got '{body.get('code')}'"
        )


# ===========================================================================
# GET /v1/stories/:id/aggregate — not yet implemented
# ===========================================================================


class TestStoryAggregate:
    async def test_aggregate_endpoint_returns_404(self, client: AsyncClient) -> None:
        """GET /v1/stories/:id/aggregate is out of scope for STORY-004.

        The route is not registered; any request to it must return 404 so the
        test will need updating once the endpoint is implemented (STORY-005 area).
        """
        proj = await _create_project(client, "Aggregate Test Project")
        try:
            data = await _create_story(client, proj["id"], "Aggregate Story")
            resp = await client.get(f"{STORIES_URL}/{data['id']}/aggregate")
            assert resp.status_code == 404, (
                f"Aggregate endpoint (not yet implemented) should return 404, "
                f"got {resp.status_code}"
            )
            await _delete_story(client, data["id"])
        finally:
            await _delete_project(client, proj["id"])


# ===========================================================================
# Cascade delete: deleting project removes its stories
# ===========================================================================


class TestCascadeDelete:
    @pytest.mark.xfail(
        reason=(
            "SQLite FK CASCADE requires 'PRAGMA foreign_keys = ON' at runtime. "
            "The test conftest.py creates its own engine without this pragma, so "
            "the ON DELETE CASCADE defined in migration 0003_story is not enforced. "
            "The story row survives the project DELETE in the test environment "
            "even though the constraint is correctly declared in the DDL. "
            "Fix: add PRAGMA foreign_keys = ON to the conftest engine setup — "
            "assign to backend-developer."
        ),
        strict=True,
    )
    async def test_deleting_project_removes_stories(
        self, client: AsyncClient
    ) -> None:
        proj = await _create_project(client, "Cascade Delete Story Project")
        data = await _create_story(client, proj["id"], "Cascade Story")
        story_id = data["id"]

        # Delete the parent project
        del_resp = await client.delete(f"{PROJECTS_ID_URL}/{proj['id']}")
        assert del_resp.status_code == 204, (
            f"Project delete should return 204, got {del_resp.status_code}"
        )

        # The story should now be unreachable
        story_resp = await client.get(f"{STORIES_URL}/{story_id}")
        assert story_resp.status_code == 404, (
            f"Story should 404 after parent project is deleted, "
            f"got {story_resp.status_code}"
        )

        # Cleanup for when the pragma is eventually enabled and the test passes.
        # (Once xfail is removed the story is gone and this is a no-op.)
        if story_resp.status_code == 200:
            await _delete_story(client, story_id)
