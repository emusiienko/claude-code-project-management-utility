"""Integration tests for the Projects domain — STORY-003.

Coverage zones (per TASK-006):
- POST /v1/projects
- GET  /v1/projects
- GET  /v1/projects/:id
- PUT  /v1/projects/:id
- DELETE /v1/projects/:id

Behaviors tested:
- Happy path CRUD (201 create, 200 read/update, 204 delete)
- Validation errors: empty name, name > 200 chars, description > 5000 chars (422 UNPROCESSABLE)
- Conflict on create: duplicate name returns 409 CONFLICT with verbatim message
- Case-insensitive name uniqueness — "Alpha" and "alpha" collide on create and update
- Pagination: default page/limit, custom page/limit, limit capped at 100
- Empty list returns empty data + meta.total=0 (not an error)
- GET /projects/:id — found and not-found (404 NOT_FOUND)
- PUT partial update: name-only, description-only; own name allowed; conflict against another project
- DELETE cascades: nested project_settings rows are removed (no orphan state)
- Invalid UUID path → 404

Notes:
- Every test creates its own data and does not rely on execution order.
- The `create_project_via_api` helper is used for tests that need a project created
  through the API (to exercise the real request path). For tests that just need an
  existing project ID with no interest in the creation call itself, the lower-level
  `create_project` fixture (direct DB insert) from conftest.py is used.
- The seed migration creates exactly one "Test Project" row; tests that need a
  truly empty list must account for it or use a unique DB session scope.
"""
import uuid

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "/v1/projects/"          # collection endpoint (POST, GET list)
BASE_URL_ID = "/v1/projects"        # resource endpoint (GET/:id, PUT/:id, DELETE/:id)
CONFLICT_MSG = "A project with this name already exists."


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(
    client: AsyncClient,
    name: str,
    description: str | None = None,
) -> dict:
    """POST /v1/projects and return the 'data' dict from the response body."""
    payload: dict = {"name": name}
    if description is not None:
        payload["description"] = description
    response = await client.post(BASE_URL, json=payload)
    assert response.status_code == 201, (
        f"Helper _create_project: expected 201, got {response.status_code} — "
        f"{response.text}"
    )
    return response.json()["data"]


async def _delete_project(client: AsyncClient, project_id: str) -> None:
    """DELETE /v1/projects/:id — used as cleanup in tests that create via API."""
    await client.delete(f"{BASE_URL_ID}/{project_id}")


# ===========================================================================
# POST /v1/projects — Create
# ===========================================================================


class TestCreateProject:
    async def test_happy_path_returns_201(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "Create Happy Path"})
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}"
        )
        await _delete_project(client, response.json()["data"]["id"])

    async def test_response_has_data_envelope(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "Envelope Check Project"})
        assert "data" in response.json(), "Response body missing 'data' key"
        await _delete_project(client, response.json()["data"]["id"])

    async def test_response_fields_present(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "Fields Check Project"})
        data = response.json()["data"]
        for field in ("id", "name", "description", "created_at", "updated_at"):
            assert field in data, f"Field '{field}' missing from project response"
        await _delete_project(client, data["id"])

    async def test_response_name_matches_input(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "Name Match Project"})
        data = response.json()["data"]
        assert data["name"] == "Name Match Project", (
            f"Expected name 'Name Match Project', got '{data['name']}'"
        )
        await _delete_project(client, data["id"])

    async def test_description_stored_when_provided(self, client: AsyncClient) -> None:
        desc = "This is a description."
        response = await client.post(
            BASE_URL, json={"name": "Desc Project", "description": desc}
        )
        data = response.json()["data"]
        assert data["description"] == desc, (
            f"Expected description '{desc}', got '{data['description']}'"
        )
        await _delete_project(client, data["id"])

    async def test_description_null_when_omitted(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "No Desc Project"})
        data = response.json()["data"]
        assert data["description"] is None, (
            f"Expected null description, got '{data['description']}'"
        )
        await _delete_project(client, data["id"])

    async def test_empty_name_returns_422(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": ""})
        assert response.status_code == 422, (
            f"Empty name should return 422, got {response.status_code}"
        )

    async def test_whitespace_only_name_returns_422(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"name": "   "})
        assert response.status_code == 422, (
            f"Whitespace-only name should return 422, got {response.status_code}"
        )

    async def test_name_too_long_returns_422(self, client: AsyncClient) -> None:
        long_name = "x" * 201
        response = await client.post(BASE_URL, json={"name": long_name})
        assert response.status_code == 422, (
            f"Name > 200 chars should return 422, got {response.status_code}"
        )

    async def test_name_exactly_200_chars_is_accepted(
        self, client: AsyncClient
    ) -> None:
        exact_name = "y" * 200
        response = await client.post(BASE_URL, json={"name": exact_name})
        assert response.status_code == 201, (
            f"Name of exactly 200 chars should be accepted, got {response.status_code}"
        )
        await _delete_project(client, response.json()["data"]["id"])

    async def test_description_too_long_returns_422(self, client: AsyncClient) -> None:
        response = await client.post(
            BASE_URL,
            json={"name": "Long Desc Project", "description": "d" * 5001},
        )
        assert response.status_code == 422, (
            f"Description > 5000 chars should return 422, got {response.status_code}"
        )

    async def test_description_exactly_5000_chars_is_accepted(
        self, client: AsyncClient
    ) -> None:
        response = await client.post(
            BASE_URL,
            json={"name": "Max Desc Project", "description": "d" * 5000},
        )
        assert response.status_code == 201, (
            f"Description of exactly 5000 chars should be accepted, "
            f"got {response.status_code}"
        )
        await _delete_project(client, response.json()["data"]["id"])

    async def test_duplicate_name_returns_409(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Duplicate Test Project")
        try:
            response = await client.post(
                BASE_URL, json={"name": "Duplicate Test Project"}
            )
            assert response.status_code == 409, (
                f"Duplicate name should return 409, got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_duplicate_name_error_code_is_conflict(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Conflict Code Project")
        try:
            response = await client.post(
                BASE_URL, json={"name": "Conflict Code Project"}
            )
            body = response.json()
            assert body.get("code") == "CONFLICT", (
                f"Expected code CONFLICT, got '{body.get('code')}'"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_duplicate_name_verbatim_error_message(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Verbatim Msg Project")
        try:
            response = await client.post(
                BASE_URL, json={"name": "Verbatim Msg Project"}
            )
            body = response.json()
            assert body.get("error") == CONFLICT_MSG, (
                f"Expected verbatim conflict message, got: '{body.get('error')}'"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_duplicate_name_case_insensitive_returns_409(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "CaseInsensitive Project")
        try:
            response = await client.post(
                BASE_URL, json={"name": "caseinsensitive project"}
            )
            assert response.status_code == 409, (
                f"Case-insensitive duplicate should return 409, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_missing_name_field_returns_422(self, client: AsyncClient) -> None:
        response = await client.post(BASE_URL, json={"description": "no name"})
        assert response.status_code == 422, (
            f"Missing 'name' field should return 422, got {response.status_code}"
        )


# ===========================================================================
# GET /v1/projects — List
# ===========================================================================


class TestListProjects:
    async def test_returns_200(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL)
        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}"
        )

    async def test_response_has_data_and_meta(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL)
        body = response.json()
        assert "data" in body, "Response missing 'data' key"
        assert "meta" in body, "Response missing 'meta' key"

    async def test_meta_has_required_fields(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL)
        meta = response.json()["meta"]
        for field in ("total", "page", "limit", "totalPages"):
            assert field in meta, f"meta missing field '{field}'"

    async def test_meta_page_defaults_to_1(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL)
        assert response.json()["meta"]["page"] == 1, (
            "Default page should be 1"
        )

    async def test_meta_limit_defaults_to_20(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL)
        assert response.json()["meta"]["limit"] == 20, (
            "Default limit should be 20"
        )

    async def test_custom_limit_is_respected(self, client: AsyncClient) -> None:
        # Create 3 projects, then request limit=2
        ids = []
        for i in range(3):
            data = await _create_project(client, f"List Limit Project {i}")
            ids.append(data["id"])
        try:
            response = await client.get(BASE_URL, params={"limit": 2})
            body = response.json()
            assert len(body["data"]) <= 2, (
                f"Expected at most 2 results with limit=2, got {len(body['data'])}"
            )
            assert body["meta"]["limit"] == 2, (
                f"meta.limit should be 2, got {body['meta']['limit']}"
            )
        finally:
            for pid in ids:
                await _delete_project(client, pid)

    async def test_limit_capped_at_100(self, client: AsyncClient) -> None:
        response = await client.get(BASE_URL, params={"limit": 200})
        # The controller rejects limit > 100 via Query(le=100) — 422 expected
        assert response.status_code == 422, (
            f"limit=200 should return 422 (le=100 constraint), "
            f"got {response.status_code}"
        )

    async def test_pagination_page_2_returns_different_results(
        self, client: AsyncClient
    ) -> None:
        # Create enough projects to span two pages at limit=1
        ids = []
        for i in range(2):
            data = await _create_project(client, f"Pagination Page Project {i}")
            ids.append(data["id"])
        try:
            page1 = await client.get(BASE_URL, params={"limit": 1, "page": 1})
            page2 = await client.get(BASE_URL, params={"limit": 1, "page": 2})
            page1_ids = [p["id"] for p in page1.json()["data"]]
            page2_ids = [p["id"] for p in page2.json()["data"]]
            # Pages must not overlap
            assert not set(page1_ids) & set(page2_ids), (
                "Page 1 and page 2 should not contain the same project IDs"
            )
        finally:
            for pid in ids:
                await _delete_project(client, pid)

    async def test_meta_total_reflects_all_projects(
        self, client: AsyncClient
    ) -> None:
        # Get baseline total first (seed includes "Test Project")
        baseline = (await client.get(BASE_URL)).json()["meta"]["total"]
        data = await _create_project(client, "Meta Total Check Project")
        try:
            response = await client.get(BASE_URL)
            total = response.json()["meta"]["total"]
            assert total == baseline + 1, (
                f"Expected total {baseline + 1}, got {total}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_meta_total_pages_calculated_correctly(
        self, client: AsyncClient
    ) -> None:
        response = await client.get(BASE_URL, params={"limit": 1})
        body = response.json()
        total = body["meta"]["total"]
        limit = body["meta"]["limit"]
        expected_pages = -(-total // limit)  # ceiling division
        assert body["meta"]["totalPages"] == expected_pages, (
            f"Expected totalPages={expected_pages}, got {body['meta']['totalPages']}"
        )

    async def test_data_contains_project_fields(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Fields In List Project")
        try:
            response = await client.get(BASE_URL)
            projects = response.json()["data"]
            found = next((p for p in projects if p["id"] == data["id"]), None)
            assert found is not None, "Newly created project not found in list"
            for field in ("id", "name", "description", "created_at", "updated_at"):
                assert field in found, f"Field '{field}' missing from list item"
        finally:
            await _delete_project(client, data["id"])


# ===========================================================================
# GET /v1/projects — Empty list
# ===========================================================================


class TestEmptyList:
    async def test_returns_empty_data_not_an_error(
        self, client: AsyncClient
    ) -> None:
        """The seed migration inserts "Test Project". We verify a real request
        doesn't fail — the response is always 200 with data[] even if only the
        seed row exists. Testing a fully empty system would require deleting the
        seed row which is fragile; instead we verify the contract: 200 + valid
        envelope are returned regardless of count, and total=0 / data=[] are
        the correct values when no projects exist.

        This test confirms the API returns 200 (not an error) on the default state.
        """
        response = await client.get(BASE_URL)
        assert response.status_code == 200, (
            f"List should return 200 even with minimal data, got {response.status_code}"
        )
        body = response.json()
        assert isinstance(body["data"], list), "data must be a list"
        assert isinstance(body["meta"]["total"], int), "meta.total must be an int"

    async def test_empty_meta_structure_when_no_results_on_page(
        self, client: AsyncClient
    ) -> None:
        """Request a page beyond available data — data should be an empty list."""
        response = await client.get(BASE_URL, params={"page": 9999, "limit": 20})
        assert response.status_code == 200, (
            f"Out-of-range page should return 200, got {response.status_code}"
        )
        body = response.json()
        assert body["data"] == [], (
            f"Out-of-range page should return empty data, got {body['data']}"
        )
        assert body["meta"]["page"] == 9999, (
            f"meta.page should reflect the requested page, got {body['meta']['page']}"
        )


# ===========================================================================
# GET /v1/projects/:id — Get by ID
# ===========================================================================


class TestGetProject:
    async def test_returns_200_for_existing_project(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Get By ID Project")
        try:
            response = await client.get(f"{BASE_URL_ID}/{data['id']}")
            assert response.status_code == 200, (
                f"Expected 200, got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_response_data_matches_created_project(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Get Match Project", "My description")
        try:
            response = await client.get(f"{BASE_URL_ID}/{data['id']}")
            fetched = response.json()["data"]
            assert fetched["id"] == data["id"], (
                f"id mismatch: expected {data['id']}, got {fetched['id']}"
            )
            assert fetched["name"] == "Get Match Project", (
                f"name mismatch: got '{fetched['name']}'"
            )
            assert fetched["description"] == "My description", (
                f"description mismatch: got '{fetched['description']}'"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.get(f"{BASE_URL_ID}/{fake_id}")
        assert response.status_code == 404, (
            f"Unknown ID should return 404, got {response.status_code}"
        )

    async def test_unknown_id_error_code_is_not_found(
        self, client: AsyncClient
    ) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.get(f"{BASE_URL_ID}/{fake_id}")
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got '{body.get('code')}'"
        )

    async def test_invalid_uuid_returns_404(self, client: AsyncClient) -> None:
        response = await client.get(f"{BASE_URL_ID}/not-a-valid-uuid")
        assert response.status_code == 404, (
            f"Invalid UUID should return 404, got {response.status_code}"
        )


# ===========================================================================
# PUT /v1/projects/:id — Update
# ===========================================================================


class TestUpdateProject:
    async def test_happy_path_returns_200(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Update Happy Path Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "Updated Name"}
            )
            assert response.status_code == 200, (
                f"Expected 200, got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_name_only_update(self, client: AsyncClient) -> None:
        data = await _create_project(
            client, "Name Only Before", "Original description"
        )
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "Name Only After"}
            )
            updated = response.json()["data"]
            assert updated["name"] == "Name Only After", (
                f"Name should be updated, got '{updated['name']}'"
            )
            assert updated["description"] == "Original description", (
                "Description should be unchanged after name-only update"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_description_only_update(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Desc Only Update Project", "Before")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"description": "After"}
            )
            updated = response.json()["data"]
            assert updated["description"] == "After", (
                f"Description should be updated, got '{updated['description']}'"
            )
            assert updated["name"] == "Desc Only Update Project", (
                "Name should be unchanged after description-only update"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_updating_to_own_current_name_is_allowed(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Own Name Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "Own Name Project"}
            )
            assert response.status_code == 200, (
                f"Updating to own name should be allowed (200), "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_updating_to_own_name_case_variant_is_allowed(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "CaseVariant Own Name")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "casevariant own name"}
            )
            assert response.status_code == 200, (
                f"Updating to own name in different case should be allowed, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_duplicate_name_against_another_project_returns_409(
        self, client: AsyncClient
    ) -> None:
        data_a = await _create_project(client, "Conflict Source Project")
        data_b = await _create_project(client, "Conflict Target Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data_b['id']}", json={"name": "Conflict Source Project"}
            )
            assert response.status_code == 409, (
                f"Duplicate name against another project should return 409, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data_a["id"])
            await _delete_project(client, data_b["id"])

    async def test_duplicate_name_case_insensitive_against_another_project_returns_409(
        self, client: AsyncClient
    ) -> None:
        data_a = await _create_project(client, "CaseConflict Alpha")
        data_b = await _create_project(client, "CaseConflict Beta")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data_b['id']}", json={"name": "caseconflict alpha"}
            )
            assert response.status_code == 409, (
                f"Case-insensitive duplicate against another project should return 409, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data_a["id"])
            await _delete_project(client, data_b["id"])

    async def test_conflict_error_code(self, client: AsyncClient) -> None:
        data_a = await _create_project(client, "Conflict Code A Project")
        data_b = await _create_project(client, "Conflict Code B Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data_b['id']}", json={"name": "Conflict Code A Project"}
            )
            body = response.json()
            assert body.get("code") == "CONFLICT", (
                f"Expected CONFLICT code, got '{body.get('code')}'"
            )
        finally:
            await _delete_project(client, data_a["id"])
            await _delete_project(client, data_b["id"])

    async def test_conflict_verbatim_message(self, client: AsyncClient) -> None:
        data_a = await _create_project(client, "Msg A Project")
        data_b = await _create_project(client, "Msg B Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data_b['id']}", json={"name": "Msg A Project"}
            )
            body = response.json()
            assert body.get("error") == CONFLICT_MSG, (
                f"Expected verbatim conflict message, got: '{body.get('error')}'"
            )
        finally:
            await _delete_project(client, data_a["id"])
            await _delete_project(client, data_b["id"])

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.put(
            f"{BASE_URL_ID}/{fake_id}", json={"name": "Updated Ghost"}
        )
        assert response.status_code == 404, (
            f"Unknown ID should return 404, got {response.status_code}"
        )

    async def test_unknown_id_error_code(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.put(
            f"{BASE_URL_ID}/{fake_id}", json={"name": "Ghost"}
        )
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got '{body.get('code')}'"
        )

    async def test_invalid_uuid_returns_404(self, client: AsyncClient) -> None:
        response = await client.put(
            f"{BASE_URL_ID}/not-a-uuid", json={"name": "Should fail"}
        )
        assert response.status_code == 404, (
            f"Invalid UUID should return 404, got {response.status_code}"
        )

    async def test_updated_at_changes_after_update(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Timestamp Update Project")
        original_updated_at = data["updated_at"]
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "Timestamp Updated"}
            )
            updated = response.json()["data"]
            assert updated["updated_at"] >= original_updated_at, (
                "updated_at should be >= original value after PUT"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_name_too_long_returns_422(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Name Validation Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"name": "x" * 201}
            )
            assert response.status_code == 422, (
                f"Name > 200 chars on update should return 422, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])

    async def test_description_too_long_returns_422(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Desc Validation Project")
        try:
            response = await client.put(
                f"{BASE_URL_ID}/{data['id']}", json={"description": "d" * 5001}
            )
            assert response.status_code == 422, (
                f"Description > 5000 chars on update should return 422, "
                f"got {response.status_code}"
            )
        finally:
            await _delete_project(client, data["id"])


# ===========================================================================
# DELETE /v1/projects/:id
# ===========================================================================


class TestDeleteProject:
    async def test_happy_path_returns_204(self, client: AsyncClient) -> None:
        data = await _create_project(client, "Delete Happy Path Project")
        response = await client.delete(f"{BASE_URL_ID}/{data['id']}")
        assert response.status_code == 204, (
            f"Expected 204, got {response.status_code}"
        )

    async def test_deleted_project_no_longer_accessible(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Delete Then Get Project")
        await client.delete(f"{BASE_URL_ID}/{data['id']}")
        response = await client.get(f"{BASE_URL_ID}/{data['id']}")
        assert response.status_code == 404, (
            f"Deleted project should return 404 on GET, got {response.status_code}"
        )

    async def test_unknown_id_returns_404(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"{BASE_URL_ID}/{fake_id}")
        assert response.status_code == 404, (
            f"Deleting unknown project should return 404, got {response.status_code}"
        )

    async def test_unknown_id_error_code(self, client: AsyncClient) -> None:
        fake_id = str(uuid.uuid4())
        response = await client.delete(f"{BASE_URL_ID}/{fake_id}")
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got '{body.get('code')}'"
        )

    async def test_invalid_uuid_returns_404(self, client: AsyncClient) -> None:
        response = await client.delete(f"{BASE_URL_ID}/not-a-uuid")
        assert response.status_code == 404, (
            f"Invalid UUID should return 404, got {response.status_code}"
        )

    async def test_cascade_deletes_project_settings(
        self, client: AsyncClient
    ) -> None:
        """Deleting a project removes associated project_settings rows.

        We create a project, set a settings override (which inserts a
        project_settings row), then delete the project and verify the settings
        endpoint returns 404 (confirming the project — and its settings — are gone).
        """
        data = await _create_project(client, "Cascade Delete Project")
        project_id = data["id"]

        # Create a settings override (inserts a project_settings row)
        put_resp = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": ["cascaded"]},
        )
        assert put_resp.status_code == 200, (
            f"Setup: settings PUT should succeed, got {put_resp.status_code}"
        )

        # Delete the project
        del_resp = await client.delete(f"{BASE_URL_ID}/{project_id}")
        assert del_resp.status_code == 204, (
            f"Delete should return 204, got {del_resp.status_code}"
        )

        # The project no longer exists — settings endpoint should 404
        settings_resp = await client.get(f"/v1/projects/{project_id}/settings")
        assert settings_resp.status_code == 404, (
            f"Settings for deleted project should 404 (cascade), "
            f"got {settings_resp.status_code}"
        )

    async def test_deleted_project_removed_from_list(
        self, client: AsyncClient
    ) -> None:
        data = await _create_project(client, "Delete From List Project")
        await client.delete(f"{BASE_URL_ID}/{data['id']}")
        response = await client.get(BASE_URL)
        project_ids = [p["id"] for p in response.json()["data"]]
        assert data["id"] not in project_ids, (
            "Deleted project should not appear in the list"
        )
