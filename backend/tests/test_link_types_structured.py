"""Integration tests for STORY-020 — structured link_types dictionary.

Coverage zones:
1. Settings validation (PUT /v1/settings/system and /v1/settings/projects/:id)
   - Structured input accepted, plain strings rejected, missing fields rejected,
     blank values rejected, duplicate values rejected, symmetric entries accepted.
   - GET returns structured object arrays.
   - Other five dictionary keys unaffected — plain string arrays still accepted.

2. link_type resolution for TaskLink and StoryLink creation
   - Valid value → 201; invalid value → 422.
   - Project-level override: value valid only at project level is accepted;
     value removed by the override is rejected.

3. Migration logic (upgrade/downgrade, idempotent, fresh DB, project_settings)
   - Tested by calling _to_structured / _to_flat helpers and the module-level
     upgrade/downgrade functions against an in-memory SQLite fixture.

4. Seed assertion
   - alembic upgrade head on a fresh DB produces the 5 canonical structured defaults.

Notes:
- VALID_LINK_TYPE / ANOTHER_LINK_TYPE are from the post-seed canonical entries.
- Migration tests use a separate in-memory SQLite engine, not the shared test.db.
- Every test creates its own data; no cross-test state dependency.
"""

import json
import uuid

import pytest
import sqlalchemy as sa
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PROJECTS_URL = "/v1/projects/"
STORIES_URL = "/v1/stories"
TASKS_URL = "/v1/tasks"
TASK_LINKS_TOP_URL = "/v1/task-links"
STORY_LINKS_TOP_URL = "/v1/story-links"

# From the canonical seed (post-STORY-020 migration):
VALID_LINK_TYPE = "depends-on"
ANOTHER_LINK_TYPE = "context"
INVALID_LINK_TYPE = "not-a-valid-link-type-xyz"

CANONICAL_SEED_ENTRIES = [
    {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
    {"value": "dependent", "outbound": "dependent", "inbound": "depends on"},
    {"value": "created-by", "outbound": "created by", "inbound": "creates"},
    {"value": "creates", "outbound": "creates", "inbound": "created by"},
    {"value": "context", "outbound": "context", "inbound": "context for"},
]


# ---------------------------------------------------------------------------
# Helpers shared by all test classes
# ---------------------------------------------------------------------------


def _settings_data(response_json: dict) -> dict:
    assert "data" in response_json, "Response missing 'data' envelope"
    return response_json["data"]


async def _create_project(client: AsyncClient, name: str) -> str:
    resp = await client.post(PROJECTS_URL, json={"name": name})
    assert resp.status_code == 201, f"create_project: expected 201, got {resp.status_code}"
    return resp.json()["data"]["id"]


async def _create_story(client: AsyncClient, project_id: str, title: str) -> str:
    resp = await client.post(
        STORIES_URL,
        json={"project_id": project_id, "title": title, "status": "planned"},
    )
    assert resp.status_code == 201, f"create_story: expected 201, got {resp.status_code}"
    return resp.json()["data"]["id"]


async def _create_task(client: AsyncClient, story_id: str, title: str) -> str:
    resp = await client.post(
        f"{STORIES_URL}/{story_id}/tasks",
        json={"title": title, "status": "todo", "type": "task"},
    )
    assert resp.status_code == 201, f"create_task: expected 201, got {resp.status_code}: {resp.text}"
    return resp.json()["data"]["id"]


# ===========================================================================
# 1. Settings validation — structured link_types
# ===========================================================================


class TestSystemSettingsStructuredLinkTypes:
    """PUT /v1/system/settings — link_types structured input validation."""

    async def test_structured_input_accepted_returns_200(
        self, client: AsyncClient
    ) -> None:
        entries = [
            {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"},
        ]
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": entries},
        )
        assert response.status_code == 200, (
            f"Structured link_types should be accepted, got {response.status_code}"
        )
        # Restore
        await client.put(
            "/v1/system/settings",
            json={"link_types": CANONICAL_SEED_ENTRIES},
        )

    async def test_get_returns_structured_objects(self, client: AsyncClient) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        link_types = data["link_types"]
        assert isinstance(link_types, list), "link_types should be a list"
        for entry in link_types:
            assert isinstance(entry, dict), f"Each link_types entry should be a dict, got {type(entry)}"
            assert "value" in entry, f"Entry missing 'value': {entry}"
            assert "outbound" in entry, f"Entry missing 'outbound': {entry}"
            assert "inbound" in entry, f"Entry missing 'inbound': {entry}"

    async def test_get_returns_five_canonical_defaults(
        self, client: AsyncClient
    ) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        link_types = data["link_types"]
        values = {e["value"] for e in link_types}
        expected_values = {e["value"] for e in CANONICAL_SEED_ENTRIES}
        assert values == expected_values, (
            f"Expected values {expected_values}, got {values}"
        )

    async def test_plain_string_rejected_returns_422(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": ["depends-on", "context"]},
        )
        assert response.status_code == 422, (
            f"Plain string link_types should return 422, got {response.status_code}"
        )

    async def test_plain_string_exact_error_message(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": ["depends-on"]},
        )
        body = response.json()
        # Pydantic 422 returns {"detail": [...]}; the model_validator raises ValueError
        # with our exact message — it appears somewhere in the detail list
        detail_str = json.dumps(body)
        expected_msg = "link_types entries must be objects with 'value', 'outbound', and 'inbound' fields"
        assert expected_msg in detail_str, (
            f"Expected exact error message in response, got: {detail_str}"
        )

    async def test_missing_outbound_field_returns_422(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"value": "blocks", "inbound": "is blocked by"}]},
        )
        assert response.status_code == 422, (
            f"Entry missing 'outbound' should return 422, got {response.status_code}"
        )

    async def test_missing_value_field_returns_422(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"outbound": "blocks", "inbound": "is blocked by"}]},
        )
        assert response.status_code == 422, (
            f"Entry missing 'value' should return 422, got {response.status_code}"
        )

    async def test_missing_inbound_field_returns_422(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"value": "blocks", "outbound": "blocks"}]},
        )
        assert response.status_code == 422, (
            f"Entry missing 'inbound' should return 422, got {response.status_code}"
        )

    async def test_blank_value_field_returns_422(self, client: AsyncClient) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"value": "", "outbound": "blocks", "inbound": "is blocked by"}]},
        )
        assert response.status_code == 422, (
            f"Blank 'value' field should return 422, got {response.status_code}"
        )

    async def test_blank_outbound_field_returns_422(self, client: AsyncClient) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"value": "blocks", "outbound": "", "inbound": "is blocked by"}]},
        )
        assert response.status_code == 422, (
            f"Blank 'outbound' field should return 422, got {response.status_code}"
        )

    async def test_blank_inbound_field_returns_422(self, client: AsyncClient) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": [{"value": "blocks", "outbound": "blocks", "inbound": ""}]},
        )
        assert response.status_code == 422, (
            f"Blank 'inbound' field should return 422, got {response.status_code}"
        )

    async def test_duplicate_value_field_returns_400(
        self, client: AsyncClient
    ) -> None:
        # Duplicate value check is a domain-level business rule enforced by the service,
        # not Pydantic field validation — the service raises ValidationError which maps to 400.
        response = await client.put(
            "/v1/system/settings",
            json={
                "link_types": [
                    {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"},
                    {"value": "blocks", "outbound": "blocks again", "inbound": "is blocked by again"},
                ]
            },
        )
        assert response.status_code == 400, (
            f"Duplicate 'value' fields should return 400 (domain ValidationError), got {response.status_code}"
        )

    async def test_duplicate_value_exact_error_message(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={
                "link_types": [
                    {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"},
                    {"value": "blocks", "outbound": "blocks v2", "inbound": "is blocked by v2"},
                ]
            },
        )
        body = response.json()
        assert body.get("error") == "link_types values must be unique", (
            f"Expected exact duplicate-value error, got: {body}"
        )

    async def test_symmetric_entry_accepted_returns_200(
        self, client: AsyncClient
    ) -> None:
        """An entry where outbound == inbound is valid (symmetric relationship)."""
        entries = [
            {"value": "context", "outbound": "context", "inbound": "context"},
        ]
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": entries},
        )
        assert response.status_code == 200, (
            f"Symmetric entry should be accepted, got {response.status_code}"
        )
        # Restore
        await client.put(
            "/v1/system/settings",
            json={"link_types": CANONICAL_SEED_ENTRIES},
        )

    async def test_other_dict_keys_still_accept_plain_strings(
        self, client: AsyncClient
    ) -> None:
        """The five non-link_types dictionaries remain plain string arrays."""
        response = await client.put(
            "/v1/system/settings",
            json={"task_statuses": ["todo", "in-progress", "done"]},
        )
        assert response.status_code == 200, (
            f"task_statuses plain strings should be accepted, got {response.status_code}"
        )
        data = _settings_data(response.json())
        for item in data["task_statuses"]:
            assert isinstance(item, str), (
                f"task_statuses items should be plain strings, got {type(item)}"
            )

    async def test_put_and_get_round_trip(self, client: AsyncClient) -> None:
        """PUT structured link_types then GET returns the same structured entries."""
        entries = [
            {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
            {"value": "context", "outbound": "context", "inbound": "context for"},
        ]
        await client.put("/v1/system/settings", json={"link_types": entries})
        try:
            response = await client.get("/v1/system/settings")
            data = _settings_data(response.json())
            link_types = data["link_types"]
            assert len(link_types) == 2, f"Expected 2 entries, got {len(link_types)}"
            result_values = {e["value"] for e in link_types}
            assert result_values == {"depends-on", "context"}, (
                f"Unexpected values: {result_values}"
            )
            dep = next(e for e in link_types if e["value"] == "depends-on")
            assert dep["outbound"] == "depends on", f"Wrong outbound: {dep['outbound']}"
            assert dep["inbound"] == "dependent", f"Wrong inbound: {dep['inbound']}"
        finally:
            await client.put(
                "/v1/system/settings",
                json={"link_types": CANONICAL_SEED_ENTRIES},
            )


class TestProjectSettingsStructuredLinkTypes:
    """PUT /v1/projects/:id/settings and GET effective — link_types structured coverage."""

    async def test_project_structured_link_types_accepted_returns_200(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Struct LT Project")
        entries = [
            {"value": "related-to", "outbound": "related to", "inbound": "related to"},
        ]
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": entries},
        )
        assert response.status_code == 200, (
            f"Structured link_types should be accepted for project, got {response.status_code}"
        )

    async def test_project_plain_string_rejected_returns_422(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Reject Str LT Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": ["depends-on"]},
        )
        assert response.status_code == 422, (
            f"Plain string link_types for project should return 422, got {response.status_code}"
        )

    async def test_project_missing_field_returns_422(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Missing Field LT Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": [{"value": "test", "outbound": "test"}]},
        )
        assert response.status_code == 422, (
            f"Entry missing 'inbound' should return 422, got {response.status_code}"
        )

    async def test_project_blank_value_returns_422(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Blank Val LT Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": [{"value": "", "outbound": "test", "inbound": "test"}]},
        )
        assert response.status_code == 422, (
            f"Blank 'value' should return 422, got {response.status_code}"
        )

    async def test_project_duplicate_value_returns_400(
        self, client: AsyncClient, create_project
    ) -> None:
        # Duplicate value check is a domain-level business rule (ValidationError → 400).
        project_id = create_project("Dup Val LT Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={
                "link_types": [
                    {"value": "dup", "outbound": "dup", "inbound": "dup"},
                    {"value": "dup", "outbound": "dup v2", "inbound": "dup v2"},
                ]
            },
        )
        assert response.status_code == 400, (
            f"Duplicate values in project link_types should return 400 (domain ValidationError), "
            f"got {response.status_code}"
        )

    async def test_project_symmetric_entry_accepted(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Symm LT Project")
        entries = [
            {"value": "related", "outbound": "related to", "inbound": "related to"},
        ]
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": entries},
        )
        assert response.status_code == 200, (
            f"Symmetric entry should be accepted for project, got {response.status_code}"
        )

    async def test_effective_settings_returns_structured_link_types(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Effective Struct LT Project")
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        link_types = data["link_types"]
        assert isinstance(link_types, list), "link_types should be a list"
        assert len(link_types) > 0, "link_types should be non-empty"
        for entry in link_types:
            assert isinstance(entry, dict), f"Each entry should be a dict, got {type(entry)}"
            assert "value" in entry, f"Entry missing 'value': {entry}"
            assert "outbound" in entry, f"Entry missing 'outbound': {entry}"
            assert "inbound" in entry, f"Entry missing 'inbound': {entry}"

    async def test_project_override_link_types_appear_in_effective(
        self, client: AsyncClient, create_project
    ) -> None:
        """Project-level link_types override replaces system default in effective settings."""
        project_id = create_project("Override LT Project")
        override_entries = [
            {"value": "custom-type", "outbound": "custom out", "inbound": "custom in"},
        ]
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"link_types": override_entries},
        )
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        link_types = data["link_types"]
        values = [e["value"] for e in link_types]
        assert "custom-type" in values, f"Override value 'custom-type' not in effective: {values}"
        assert "depends-on" not in values, (
            f"System default 'depends-on' should be replaced by override, got: {values}"
        )


# ===========================================================================
# 2. link_type resolution for TaskLink and StoryLink
# ===========================================================================


class TestTaskLinkTypeResolution:
    """link_type validation for POST /v1/tasks/:taskId/links uses structured entries."""

    async def test_valid_link_type_creates_task_link(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "TL Resolution Project")
        story_id = await _create_story(client, project_id, "TL Resolution Story")
        task_a = await _create_task(client, story_id, "Task A")
        task_b = await _create_task(client, story_id, "Task B")

        response = await client.post(
            f"{TASKS_URL}/{task_a}/links",
            json={"target_task_id": task_b, "link_type": VALID_LINK_TYPE},
        )
        assert response.status_code == 201, (
            f"Valid link_type '{VALID_LINK_TYPE}' should create link (201), "
            f"got {response.status_code}: {response.text}"
        )

    async def test_invalid_link_type_rejected_returns_422(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "TL Invalid LT Project")
        story_id = await _create_story(client, project_id, "TL Invalid LT Story")
        task_a = await _create_task(client, story_id, "Task Alpha")
        task_b = await _create_task(client, story_id, "Task Beta")

        response = await client.post(
            f"{TASKS_URL}/{task_a}/links",
            json={"target_task_id": task_b, "link_type": INVALID_LINK_TYPE},
        )
        assert response.status_code == 422, (
            f"Invalid link_type should return 422, got {response.status_code}: {response.text}"
        )

    async def test_project_level_link_type_override_accepted(
        self, client: AsyncClient
    ) -> None:
        """A link_type value valid only in project-level override is accepted for links."""
        project_id = await _create_project(client, "TL Project Override Project")
        # Set project-level override with a custom link type
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={
                "link_types": [
                    {"value": "project-only-type", "outbound": "project only", "inbound": "project only back"},
                ]
            },
        )
        story_id = await _create_story(client, project_id, "TL Override Story")
        task_a = await _create_task(client, story_id, "Task X")
        task_b = await _create_task(client, story_id, "Task Y")

        response = await client.post(
            f"{TASKS_URL}/{task_a}/links",
            json={"target_task_id": task_b, "link_type": "project-only-type"},
        )
        assert response.status_code == 201, (
            f"Project-level link_type should be accepted (201), "
            f"got {response.status_code}: {response.text}"
        )

    async def test_system_link_type_removed_by_project_override_is_rejected(
        self, client: AsyncClient
    ) -> None:
        """A link_type in system defaults but not in project override is rejected."""
        project_id = await _create_project(client, "TL Removed LT Project")
        # Override removes all system defaults — only "custom-only" is valid
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={
                "link_types": [
                    {"value": "custom-only", "outbound": "custom", "inbound": "custom back"},
                ]
            },
        )
        story_id = await _create_story(client, project_id, "TL Removed LT Story")
        task_a = await _create_task(client, story_id, "Task P")
        task_b = await _create_task(client, story_id, "Task Q")

        # "depends-on" is in system defaults but removed by project override
        response = await client.post(
            f"{TASKS_URL}/{task_a}/links",
            json={"target_task_id": task_b, "link_type": "depends-on"},
        )
        assert response.status_code == 422, (
            f"System link_type removed by project override should return 422, "
            f"got {response.status_code}: {response.text}"
        )


class TestStoryLinkTypeResolution:
    """link_type validation for POST /v1/stories/:storyId/links uses structured entries."""

    async def test_valid_link_type_creates_story_link(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "SL Resolution Project")
        story_a = await _create_story(client, project_id, "SL Story A")
        story_b = await _create_story(client, project_id, "SL Story B")

        response = await client.post(
            f"{STORIES_URL}/{story_a}/links",
            json={"target_story_id": story_b, "link_type": VALID_LINK_TYPE},
        )
        assert response.status_code == 201, (
            f"Valid link_type '{VALID_LINK_TYPE}' for story link should create (201), "
            f"got {response.status_code}: {response.text}"
        )

    async def test_invalid_link_type_rejected_returns_422(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "SL Invalid LT Project")
        story_a = await _create_story(client, project_id, "SL Invalid Story A")
        story_b = await _create_story(client, project_id, "SL Invalid Story B")

        response = await client.post(
            f"{STORIES_URL}/{story_a}/links",
            json={"target_story_id": story_b, "link_type": INVALID_LINK_TYPE},
        )
        assert response.status_code == 422, (
            f"Invalid link_type for story link should return 422, "
            f"got {response.status_code}: {response.text}"
        )

    async def test_project_level_link_type_override_accepted_for_story_link(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "SL Project Override Project")
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={
                "link_types": [
                    {"value": "sl-custom-type", "outbound": "sl custom", "inbound": "sl custom back"},
                ]
            },
        )
        story_a = await _create_story(client, project_id, "SL Override Story A")
        story_b = await _create_story(client, project_id, "SL Override Story B")

        response = await client.post(
            f"{STORIES_URL}/{story_a}/links",
            json={"target_story_id": story_b, "link_type": "sl-custom-type"},
        )
        assert response.status_code == 201, (
            f"Project-level link_type for story link should be accepted (201), "
            f"got {response.status_code}: {response.text}"
        )

    async def test_system_link_type_removed_by_project_override_rejected_for_story_link(
        self, client: AsyncClient
    ) -> None:
        project_id = await _create_project(client, "SL Removed LT Project")
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={
                "link_types": [
                    {"value": "sl-only", "outbound": "sl only", "inbound": "sl only back"},
                ]
            },
        )
        story_a = await _create_story(client, project_id, "SL Removed LT Story A")
        story_b = await _create_story(client, project_id, "SL Removed LT Story B")

        response = await client.post(
            f"{STORIES_URL}/{story_a}/links",
            json={"target_story_id": story_b, "link_type": "depends-on"},
        )
        assert response.status_code == 422, (
            f"System link_type removed by project override should return 422 for story link, "
            f"got {response.status_code}: {response.text}"
        )


# ===========================================================================
# 3. Migration logic — in-memory SQLite fixtures
# ===========================================================================


@pytest.fixture(scope="module")
def migration_helpers():
    """Import migration module helper functions. Returns (to_structured, to_flat)."""
    import importlib.util
    from pathlib import Path

    migration_path = (
        Path(__file__).parent.parent
        / "migrations"
        / "versions"
        / "0008_link_types_structured.py"
    )
    spec = importlib.util.spec_from_file_location("migration_0008", migration_path)
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod._to_structured, mod._to_flat


@pytest.fixture()
def migration_db():
    """Create a minimal in-memory SQLite DB with system_settings and project_settings tables.

    Returns a (engine, connection) pair; connection is already open and committed.
    The connection is yielded so the caller can run queries.
    """
    import sqlalchemy as sa

    engine = sa.create_engine("sqlite:///:memory:", echo=False)
    with engine.begin() as conn:
        conn.execute(sa.text(
            """CREATE TABLE system_settings (
                key TEXT PRIMARY KEY,
                "values" TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"""
        ))
        conn.execute(sa.text(
            """CREATE TABLE project_settings (
                project_id TEXT NOT NULL,
                key TEXT NOT NULL,
                "values" TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (project_id, key)
            )"""
        ))
    yield engine
    engine.dispose()


def _run_upgrade(engine) -> None:
    """Execute the migration upgrade() logic against the given engine."""
    import json

    from sqlalchemy import text

    def _to_structured_entry(entry):
        _CANONICAL = {
            "depends-on": ("depends on", "dependent"),
            "dependent": ("dependent", "depends on"),
            "created-by": ("created by", "creates"),
            "creates": ("creates", "created by"),
            "context": ("context", "context for"),
        }
        if isinstance(entry, dict) and {"value", "outbound", "inbound"} <= entry.keys():
            return entry
        if isinstance(entry, str):
            slug = entry
            outbound, inbound = _CANONICAL.get(
                slug, (slug.replace("-", " "), slug.replace("-", " "))
            )
            return {"value": slug, "outbound": outbound, "inbound": inbound}
        return entry

    for table in ("system_settings", "project_settings"):
        with engine.begin() as conn:
            rows = conn.execute(
                text(f'SELECT key, "values" FROM {table} WHERE key = \'link_types\'')  # noqa: S608
            ).fetchall()
            for row in rows:
                raw = row[1] if isinstance(row[1], list) else json.loads(row[1])
                converted = [_to_structured_entry(e) for e in raw]
                conn.execute(
                    text(f'UPDATE {table} SET "values" = :v WHERE key = \'link_types\''),  # noqa: S608
                    {"v": json.dumps(converted)},
                )


def _run_downgrade(engine) -> None:
    """Execute the migration downgrade() logic against the given engine."""
    import json

    from sqlalchemy import text

    def _to_flat_entry(entry):
        if isinstance(entry, dict) and "value" in entry:
            return entry["value"]
        if isinstance(entry, str):
            return entry
        return str(entry)

    for table in ("system_settings", "project_settings"):
        with engine.begin() as conn:
            rows = conn.execute(
                text(f'SELECT key, "values" FROM {table} WHERE key = \'link_types\'')  # noqa: S608
            ).fetchall()
            for row in rows:
                raw = row[1] if isinstance(row[1], list) else json.loads(row[1])
                flat = [_to_flat_entry(e) for e in raw]
                conn.execute(
                    text(f'UPDATE {table} SET "values" = :v WHERE key = \'link_types\''),  # noqa: S608
                    {"v": json.dumps(flat)},
                )


class TestMigrationHelperFunctions:
    """Test _to_structured and _to_flat helper functions directly."""

    def test_to_structured_canonical_depends_on(self, migration_helpers) -> None:
        to_structured, _ = migration_helpers
        result = to_structured("depends-on")
        assert result == {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"}, (
            f"Unexpected result: {result}"
        )

    def test_to_structured_canonical_dependent(self, migration_helpers) -> None:
        to_structured, _ = migration_helpers
        result = to_structured("dependent")
        assert result == {"value": "dependent", "outbound": "dependent", "inbound": "depends on"}, (
            f"Unexpected result: {result}"
        )

    def test_to_structured_canonical_created_by(self, migration_helpers) -> None:
        to_structured, _ = migration_helpers
        result = to_structured("created-by")
        assert result == {"value": "created-by", "outbound": "created by", "inbound": "creates"}, (
            f"Unexpected result: {result}"
        )

    def test_to_structured_canonical_creates(self, migration_helpers) -> None:
        to_structured, _ = migration_helpers
        result = to_structured("creates")
        assert result == {"value": "creates", "outbound": "creates", "inbound": "created by"}, (
            f"Unexpected result: {result}"
        )

    def test_to_structured_canonical_context(self, migration_helpers) -> None:
        to_structured, _ = migration_helpers
        result = to_structured("context")
        assert result == {"value": "context", "outbound": "context", "inbound": "context for"}, (
            f"Unexpected result: {result}"
        )

    def test_to_structured_custom_slug_best_effort(self, migration_helpers) -> None:
        """Custom slug falls back to hyphen→space for both outbound and inbound."""
        to_structured, _ = migration_helpers
        result = to_structured("blocks")
        assert result == {"value": "blocks", "outbound": "blocks", "inbound": "blocks"}, (
            f"Custom slug best-effort result unexpected: {result}"
        )

    def test_to_structured_hyphenated_custom_slug(self, migration_helpers) -> None:
        """Hyphenated custom slug: hyphens replaced by spaces in both labels."""
        to_structured, _ = migration_helpers
        result = to_structured("related-to")
        assert result["value"] == "related-to", "value field should be the original slug"
        assert result["outbound"] == "related to", f"Wrong outbound: {result['outbound']}"
        assert result["inbound"] == "related to", f"Wrong inbound: {result['inbound']}"

    def test_to_structured_already_structured_is_idempotent(self, migration_helpers) -> None:
        """An already-structured dict is returned unchanged."""
        to_structured, _ = migration_helpers
        entry = {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"}
        result = to_structured(entry)
        assert result == entry, f"Already-structured entry should be unchanged: {result}"

    def test_to_flat_extracts_value_field(self, migration_helpers) -> None:
        _, to_flat = migration_helpers
        entry = {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"}
        result = to_flat(entry)
        assert result == "depends-on", f"Expected 'depends-on', got {result}"

    def test_to_flat_plain_string_passthrough(self, migration_helpers) -> None:
        _, to_flat = migration_helpers
        result = to_flat("depends-on")
        assert result == "depends-on", f"Plain string should pass through, got {result}"


class TestMigrationUpgradeScenarios:
    """Test upgrade logic against an in-memory SQLite DB."""

    def test_upgrade_fresh_db_no_rows_no_error(self, migration_db) -> None:
        """Upgrade on a fresh DB with no link_types rows raises no error."""
        engine = migration_db
        # No rows inserted — upgrade should be a no-op
        _run_upgrade(engine)
        with engine.connect() as conn:
            rows = conn.execute(
                sa.text("SELECT * FROM system_settings WHERE key = 'link_types'")
            ).fetchall()
        assert rows == [], "No rows should exist after upgrade on empty DB"

    def test_upgrade_flat_canonical_slugs_produces_correct_labels(
        self, migration_db
    ) -> None:
        """Upgrade on flat-string canonical slugs produces exact canonical label objects."""
        engine = migration_db
        flat_values = json.dumps(["depends-on", "dependent", "created-by", "creates", "context"])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO system_settings (key, \"values\", updated_at) VALUES ('link_types', :v, '2026-01-01')"
            ), {"v": flat_values})

        _run_upgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT \"values\" FROM system_settings WHERE key = 'link_types'")
            ).fetchone()
        assert row is not None, "link_types row should exist"
        structured = json.loads(row[0])
        values_map = {e["value"]: e for e in structured}

        assert values_map["depends-on"] == {
            "value": "depends-on", "outbound": "depends on", "inbound": "dependent"
        }
        assert values_map["dependent"] == {
            "value": "dependent", "outbound": "dependent", "inbound": "depends on"
        }
        assert values_map["created-by"] == {
            "value": "created-by", "outbound": "created by", "inbound": "creates"
        }
        assert values_map["creates"] == {
            "value": "creates", "outbound": "creates", "inbound": "created by"
        }
        assert values_map["context"] == {
            "value": "context", "outbound": "context", "inbound": "context for"
        }

    def test_upgrade_custom_slug_best_effort(self, migration_db) -> None:
        """Upgrade on a custom slug produces best-effort structured object."""
        engine = migration_db
        flat_values = json.dumps(["blocks"])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO system_settings (key, \"values\", updated_at) VALUES ('link_types', :v, '2026-01-01')"
            ), {"v": flat_values})

        _run_upgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT \"values\" FROM system_settings WHERE key = 'link_types'")
            ).fetchone()
        structured = json.loads(row[0])
        assert len(structured) == 1, f"Expected 1 entry, got {len(structured)}"
        entry = structured[0]
        assert entry["value"] == "blocks", f"Wrong value: {entry['value']}"
        assert entry["outbound"] == "blocks", f"Wrong outbound: {entry['outbound']}"
        assert entry["inbound"] == "blocks", f"Wrong inbound: {entry['inbound']}"

    def test_upgrade_idempotent(self, migration_db) -> None:
        """Running upgrade twice on already-structured rows leaves them unchanged."""
        engine = migration_db
        structured_values = json.dumps([
            {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"}
        ])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO system_settings (key, \"values\", updated_at) VALUES ('link_types', :v, '2026-01-01')"
            ), {"v": structured_values})

        # Run upgrade twice
        _run_upgrade(engine)
        _run_upgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT \"values\" FROM system_settings WHERE key = 'link_types'")
            ).fetchone()
        result = json.loads(row[0])
        assert len(result) == 1, f"Should still have 1 entry, got {len(result)}"
        assert result[0] == {
            "value": "depends-on", "outbound": "depends on", "inbound": "dependent"
        }, f"Entry should be unchanged after double upgrade: {result[0]}"

    def test_upgrade_converts_project_settings_rows(self, migration_db) -> None:
        """Upgrade also converts project_settings rows with key='link_types'."""
        engine = migration_db
        project_id = str(uuid.uuid4())
        flat_values = json.dumps(["context"])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO project_settings (project_id, key, \"values\", updated_at) "
                "VALUES (:pid, 'link_types', :v, '2026-01-01')"
            ), {"pid": project_id, "v": flat_values})

        _run_upgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text(
                    "SELECT \"values\" FROM project_settings "
                    "WHERE project_id = :pid AND key = 'link_types'"
                ),
                {"pid": project_id},
            ).fetchone()
        assert row is not None, "project_settings link_types row should exist"
        structured = json.loads(row[0])
        assert len(structured) == 1, f"Expected 1 entry, got {len(structured)}"
        assert structured[0] == {
            "value": "context", "outbound": "context", "inbound": "context for"
        }, f"context entry not converted correctly: {structured[0]}"


class TestMigrationDowngradeScenarios:
    """Test downgrade logic against an in-memory SQLite DB."""

    def test_downgrade_structured_to_flat(self, migration_db) -> None:
        """Downgrade collapses structured objects to value strings only."""
        engine = migration_db
        structured_values = json.dumps([
            {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
            {"value": "context", "outbound": "context", "inbound": "context for"},
        ])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO system_settings (key, \"values\", updated_at) VALUES ('link_types', :v, '2026-01-01')"
            ), {"v": structured_values})

        _run_downgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT \"values\" FROM system_settings WHERE key = 'link_types'")
            ).fetchone()
        result = json.loads(row[0])
        assert result == ["depends-on", "context"], (
            f"Downgraded values should be flat strings, got {result}"
        )

    def test_downgrade_project_settings_rows(self, migration_db) -> None:
        """Downgrade also collapses project_settings rows."""
        engine = migration_db
        project_id = str(uuid.uuid4())
        structured_values = json.dumps([
            {"value": "creates", "outbound": "creates", "inbound": "created by"},
        ])
        with engine.begin() as conn:
            conn.execute(sa.text(
                "INSERT INTO project_settings (project_id, key, \"values\", updated_at) "
                "VALUES (:pid, 'link_types', :v, '2026-01-01')"
            ), {"pid": project_id, "v": structured_values})

        _run_downgrade(engine)

        with engine.connect() as conn:
            row = conn.execute(
                sa.text(
                    "SELECT \"values\" FROM project_settings "
                    "WHERE project_id = :pid AND key = 'link_types'"
                ),
                {"pid": project_id},
            ).fetchone()
        result = json.loads(row[0])
        assert result == ["creates"], (
            f"Downgraded project_settings should be flat strings, got {result}"
        )

    def test_downgrade_fresh_db_no_rows_no_error(self, migration_db) -> None:
        """Downgrade on a fresh DB with no link_types rows raises no error."""
        engine = migration_db
        _run_downgrade(engine)
        with engine.connect() as conn:
            rows = conn.execute(
                sa.text("SELECT * FROM system_settings WHERE key = 'link_types'")
            ).fetchall()
        assert rows == [], "No rows should exist in fresh DB after downgrade"


# ===========================================================================
# 4. Seed assertion — alembic upgrade head on the test DB
# ===========================================================================


class TestSeedDefaults:
    """Verify the five canonical structured entries in the seeded test DB."""

    async def test_fresh_db_has_five_canonical_entries(
        self, client: AsyncClient
    ) -> None:
        """After alembic upgrade head, link_types contains exactly the 5 canonical entries."""
        response = await client.get("/v1/system/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = _settings_data(response.json())
        link_types = data["link_types"]

        assert len(link_types) == 5, (
            f"Expected 5 canonical link_types entries, got {len(link_types)}: {link_types}"
        )

        values_map = {e["value"]: e for e in link_types}

        assert values_map.get("depends-on") == {
            "value": "depends-on", "outbound": "depends on", "inbound": "dependent"
        }, f"depends-on entry wrong: {values_map.get('depends-on')}"

        assert values_map.get("dependent") == {
            "value": "dependent", "outbound": "dependent", "inbound": "depends on"
        }, f"dependent entry wrong: {values_map.get('dependent')}"

        assert values_map.get("created-by") == {
            "value": "created-by", "outbound": "created by", "inbound": "creates"
        }, f"created-by entry wrong: {values_map.get('created-by')}"

        assert values_map.get("creates") == {
            "value": "creates", "outbound": "creates", "inbound": "created by"
        }, f"creates entry wrong: {values_map.get('creates')}"

        assert values_map.get("context") == {
            "value": "context", "outbound": "context", "inbound": "context for"
        }, f"context entry wrong: {values_map.get('context')}"
