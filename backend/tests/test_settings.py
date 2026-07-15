"""Integration tests for the Settings domain — STORY-002 (+ STORY-021 retirement).

Coverage zones (per TASK-009, revised by STORY-021/TASK-006):
- GET  /v1/system/settings
- PUT  /v1/system/settings
- GET  /v1/projects/:id/settings
- GET  /v1/projects/:id/settings/effective
- PUT  /v1/projects/:id/settings

Behaviors tested:
- All five dictionary keys present in system settings response (STORY-021 retired
  `attachment_types` — Settings dropped from six keys to five)
- Partial PUT updates only specified keys; others unchanged
- Unknown key (including the retired `attachment_types`) → 422
- Empty values list → 400 with verbatim "Dictionary values cannot be empty."
- Project override fully replaces (not merges) system default for that key
- Project with no overrides returns system defaults as effective settings
- Updating system default changes effective value for projects without override
- Updating one project's override does not change another project's effective settings
- Clearing one key's override (via PUT with only other keys) leaves others untouched
- Missing project → 404 for all project-scoped endpoints

Notes:
- The `create_project` fixture creates a real row in the `project` table.
  Each test that needs a project calls it; the fixture handles cleanup.
- System settings are seeded by migration 0003 and shared across tests.
  Tests that mutate system settings MUST restore them to avoid inter-test
  interference (use try/finally or restore in the test body).
- `attachment_types` is intentionally NOT in ALL_KEYS / SEED_DEFAULTS below —
  STORY-021 / TASK-002 removed it from `ALL_DICT_KEYS` entirely and migration
  0010_attachment_title deletes its seeded rows. See TestAttachmentTypesRetired.
"""
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Five canonical dictionary keys (mirrors app.settings.schema.ALL_DICT_KEYS,
# post-STORY-021 retirement of attachment_types)
# ---------------------------------------------------------------------------

ALL_KEYS = {
    "task_statuses",
    "task_types",
    "story_statuses",
    "link_types",
    "participant_roles",
}

# Seed defaults from migration 0003 — used as restore values.
# link_types is stored and returned as structured objects (LinkTypeEntry), not plain strings.
SEED_DEFAULTS: dict[str, list] = {
    "task_statuses": ["todo", "in-progress", "done"],
    "task_types": ["task", "bug", "testing-task"],
    "story_statuses": ["planned", "in-progress", "pending-approval", "accepted"],
    "link_types": [
        {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
        {"value": "dependent", "outbound": "dependent", "inbound": "depends on"},
        {"value": "created-by", "outbound": "created by", "inbound": "creates"},
        {"value": "creates", "outbound": "creates", "inbound": "created by"},
        {"value": "context", "outbound": "context", "inbound": "context for"},
    ],
    "participant_roles": [
        "orchestrator",
        "architect",
        "backend-developer",
        "frontend-developer",
        "devops",
        "spec-writer",
        "qa-automation",
        "manual-qa",
    ],
}

# Restore payload for link_types — canonical structured objects matching the seed migration.
SEED_LINK_TYPES_PAYLOAD = [
    {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
    {"value": "dependent", "outbound": "dependent", "inbound": "depends on"},
    {"value": "created-by", "outbound": "created by", "inbound": "creates"},
    {"value": "creates", "outbound": "creates", "inbound": "created by"},
    {"value": "context", "outbound": "context", "inbound": "context for"},
]


def _sort_key(item: object) -> str:
    if isinstance(item, dict):
        return item.get("value", "")  # type: ignore[return-value]
    return str(item)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _settings_data(response_json: dict) -> dict:
    """Extract the `data` envelope from a settings response."""
    assert "data" in response_json, "Response missing 'data' envelope"
    return response_json["data"]


# ===========================================================================
# GET /v1/system/settings
# ===========================================================================


class TestGetSystemSettings:
    async def test_returns_200(self, client: AsyncClient) -> None:
        response = await client.get("/v1/system/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    async def test_response_has_data_envelope(self, client: AsyncClient) -> None:
        response = await client.get("/v1/system/settings")
        body = response.json()
        assert "data" in body, "Response body missing 'data' key"

    async def test_all_five_keys_present(self, client: AsyncClient) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert key in data, f"Missing key '{key}' in system settings response"

    async def test_values_are_non_empty_lists(self, client: AsyncClient) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert isinstance(data[key], list), f"'{key}' should be a list"
            assert len(data[key]) > 0, f"'{key}' should be non-empty after seeding"

    async def test_seed_values_match_expected_defaults(
        self, client: AsyncClient
    ) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        for key, expected in SEED_DEFAULTS.items():
            assert sorted(data[key], key=_sort_key) == sorted(expected, key=_sort_key), (
                f"Key '{key}': expected {expected}, got {data[key]}"
            )


# ===========================================================================
# PUT /v1/system/settings
# ===========================================================================


class TestUpdateSystemSettings:
    async def test_happy_path_partial_update_returns_200(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"task_statuses": ["todo", "in-progress", "done", "blocked"]},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        # Restore
        await client.put(
            "/v1/system/settings",
            json={"task_statuses": SEED_DEFAULTS["task_statuses"]},
        )

    async def test_partial_update_changes_only_specified_key(
        self, client: AsyncClient
    ) -> None:
        new_statuses = ["alpha", "beta"]
        response = await client.put(
            "/v1/system/settings",
            json={"task_statuses": new_statuses},
        )
        data = _settings_data(response.json())

        # Updated key reflects new value
        assert data["task_statuses"] == new_statuses, (
            f"task_statuses should be {new_statuses}, got {data['task_statuses']}"
        )
        # Other keys remain at seed defaults
        for key in ALL_KEYS - {"task_statuses"}:
            assert sorted(data[key], key=_sort_key) == sorted(SEED_DEFAULTS[key], key=_sort_key), (
                f"Unmodified key '{key}' was unexpectedly changed"
            )

        # Restore
        await client.put(
            "/v1/system/settings",
            json={"task_statuses": SEED_DEFAULTS["task_statuses"]},
        )

    async def test_update_returns_all_five_keys(self, client: AsyncClient) -> None:
        new_link_types = [
            {"value": "depends-on", "outbound": "depends on", "inbound": "is depended on by"},
            {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"},
        ]
        response = await client.put(
            "/v1/system/settings",
            json={"link_types": new_link_types},
        )
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert key in data, f"Response missing key '{key}' after PUT"

        # Restore
        await client.put(
            "/v1/system/settings",
            json={"link_types": SEED_DEFAULTS["link_types"]},
        )

    async def test_unknown_key_returns_422(self, client: AsyncClient) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"non_existent_key": ["a", "b"]},
        )
        assert response.status_code == 422, (
            f"Unknown key should return 422, got {response.status_code}"
        )

    async def test_unknown_key_error_code(self, client: AsyncClient) -> None:
        # Pydantic model_validator raises ValueError → FastAPI returns 422 with
        # default {"detail": [...]} structure (request_validation_error_handler
        # was removed in SESSION-007; see docs/sessions/SESSION-007-*.md).
        response = await client.put(
            "/v1/system/settings",
            json={"non_existent_key": ["a", "b"]},
        )
        body = response.json()
        assert "detail" in body, "Pydantic 422 response missing 'detail'"
        assert isinstance(body["detail"], list), (
            f"'detail' should be a list, got {type(body['detail'])}"
        )

    async def test_empty_values_returns_400(self, client: AsyncClient) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"task_statuses": []},
        )
        assert response.status_code == 400, (
            f"Empty values should return 400, got {response.status_code}"
        )

    async def test_empty_values_verbatim_error_message(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"task_statuses": []},
        )
        body = response.json()
        assert body.get("error") == "Dictionary values cannot be empty.", (
            f"Expected verbatim error message, got: {body.get('error')}"
        )

    async def test_no_body_keys_returns_current_settings(
        self, client: AsyncClient
    ) -> None:
        # Empty body (no keys) — should return current settings without error.
        response = await client.put("/v1/system/settings", json={})
        assert response.status_code == 200, (
            f"Empty body should return 200, got {response.status_code}"
        )
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert key in data, f"Missing key '{key}' in empty-body PUT response"

    async def test_update_multiple_keys_in_one_request(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={
                "task_statuses": ["todo", "wip", "done"],
                "task_types": ["task", "spike"],
            },
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = _settings_data(response.json())
        assert data["task_statuses"] == ["todo", "wip", "done"], (
            f"task_statuses not updated correctly: {data['task_statuses']}"
        )
        assert data["task_types"] == ["task", "spike"], (
            f"task_types not updated correctly: {data['task_types']}"
        )

        # Restore both
        await client.put(
            "/v1/system/settings",
            json={
                "task_statuses": SEED_DEFAULTS["task_statuses"],
                "task_types": SEED_DEFAULTS["task_types"],
            },
        )


# ===========================================================================
# GET /v1/projects/:id/settings
# ===========================================================================


class TestGetProjectSettings:
    async def test_returns_200_for_existing_project(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Settings Test Project")
        response = await client.get(f"/v1/projects/{project_id}/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    async def test_returns_empty_data_when_no_overrides(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("No Overrides Project")
        response = await client.get(f"/v1/projects/{project_id}/settings")
        data = _settings_data(response.json())
        # No overrides — data should be an empty dict (no keys present).
        assert data == {}, (
            f"New project with no overrides should return empty data, got: {data}"
        )

    async def test_returns_only_overridden_keys(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Partial Override Project")
        # Set one override
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": ["open", "closed"]},
        )

        response = await client.get(f"/v1/projects/{project_id}/settings")
        data = _settings_data(response.json())

        assert "task_statuses" in data, "Overridden key should appear in response"
        assert data["task_statuses"] == ["open", "closed"], (
            f"Expected ['open', 'closed'], got {data['task_statuses']}"
        )
        # Non-overridden keys should NOT appear
        for key in ALL_KEYS - {"task_statuses"}:
            assert key not in data, (
                f"Non-overridden key '{key}' should not appear in overrides response"
            )

    async def test_missing_project_returns_404(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(f"/v1/projects/{fake_id}/settings")
        assert response.status_code == 404, (
            f"Missing project should return 404, got {response.status_code}"
        )

    async def test_missing_project_error_code(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(f"/v1/projects/{fake_id}/settings")
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got {body.get('code')}"
        )

    async def test_invalid_uuid_returns_404(self, client: AsyncClient) -> None:
        response = await client.get("/v1/projects/not-a-uuid/settings")
        assert response.status_code == 404, (
            f"Invalid UUID should return 404, got {response.status_code}"
        )


# ===========================================================================
# GET /v1/projects/:id/settings/effective
# ===========================================================================


class TestGetEffectiveProjectSettings:
    async def test_returns_200_for_existing_project(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Effective Settings Project")
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    async def test_all_five_keys_present(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Six Keys Project")
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert key in data, (
                f"Missing key '{key}' in effective settings response"
            )

    async def test_no_overrides_returns_system_defaults(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Defaults Project")
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        for key, expected in SEED_DEFAULTS.items():
            assert sorted(data[key], key=_sort_key) == sorted(expected, key=_sort_key), (
                f"Key '{key}': project with no overrides should return seed default"
            )

    async def test_override_replaces_system_default(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Override Project")
        override_values = ["custom-todo", "custom-done"]

        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": override_values},
        )

        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())

        assert data["task_statuses"] == override_values, (
            f"Effective key should be override value {override_values}, "
            f"got {data['task_statuses']}"
        )
        # Other keys still use system defaults
        for key in ALL_KEYS - {"task_statuses"}:
            assert sorted(data[key], key=_sort_key) == sorted(SEED_DEFAULTS[key], key=_sort_key), (
                f"Non-overridden key '{key}' should still use system default"
            )

    async def test_missing_project_returns_404(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/v1/projects/{fake_id}/settings/effective"
        )
        assert response.status_code == 404, (
            f"Missing project should return 404, got {response.status_code}"
        )

    async def test_missing_project_error_code(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/v1/projects/{fake_id}/settings/effective"
        )
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got {body.get('code')}"
        )

    async def test_system_default_update_propagates_to_project_without_override(
        self, client: AsyncClient, create_project
    ) -> None:
        """Updating a system default immediately changes effective value for
        projects that have no override for that key."""
        project_id = create_project("Propagation Project")
        new_link_types = [
            {"value": "blocks", "outbound": "blocks", "inbound": "is blocked by"},
            {"value": "is-blocked-by", "outbound": "is blocked by", "inbound": "blocks"},
            {"value": "context", "outbound": "context", "inbound": "context"},
        ]

        await client.put(
            "/v1/system/settings",
            json={"link_types": new_link_types},
        )
        try:
            response = await client.get(
                f"/v1/projects/{project_id}/settings/effective"
            )
            data = _settings_data(response.json())
            assert data["link_types"] == new_link_types, (
                f"Effective link_types should reflect updated system default, "
                f"got {data['link_types']}"
            )
        finally:
            # Restore system default
            await client.put(
                "/v1/system/settings",
                json={"link_types": SEED_DEFAULTS["link_types"]},
            )

    async def test_system_default_update_does_not_change_project_with_override(
        self, client: AsyncClient, create_project
    ) -> None:
        """Once a project has an override, system default changes should not
        affect the project's effective value for that key."""
        project_id = create_project("Pinned Override Project")
        pinned_values = ["my-status-a", "my-status-b"]

        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": pinned_values},
        )

        # Now change the system default
        await client.put(
            "/v1/system/settings",
            json={"task_statuses": ["global-a", "global-b", "global-c"]},
        )
        try:
            response = await client.get(
                f"/v1/projects/{project_id}/settings/effective"
            )
            data = _settings_data(response.json())
            assert data["task_statuses"] == pinned_values, (
                f"Project with override should keep pinned values, "
                f"got {data['task_statuses']}"
            )
        finally:
            await client.put(
                "/v1/system/settings",
                json={"task_statuses": SEED_DEFAULTS["task_statuses"]},
            )


# ===========================================================================
# PUT /v1/projects/:id/settings
# ===========================================================================


class TestUpdateProjectSettings:
    async def test_happy_path_returns_200(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("PUT Settings Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": ["todo", "done"]},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    async def test_returns_effective_settings_after_update(
        self, client: AsyncClient, create_project
    ) -> None:
        """PUT /projects/:id/settings returns effective (all five keys), not just overrides."""
        project_id = create_project("Effective After PUT Project")
        override = ["x", "y"]
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"story_statuses": override},
        )
        data = _settings_data(response.json())

        # All five keys must be present
        for key in ALL_KEYS:
            assert key in data, f"Response after PUT missing key '{key}'"

        # Overridden key is the new value
        assert data["story_statuses"] == override, (
            f"Overridden key should be {override}, got {data['story_statuses']}"
        )
        # Other keys are system defaults
        for key in ALL_KEYS - {"story_statuses"}:
            assert sorted(data[key], key=_sort_key) == sorted(SEED_DEFAULTS[key], key=_sort_key), (
                f"Non-overridden key '{key}' should still be system default"
            )

    async def test_override_fully_replaces_not_merges(
        self, client: AsyncClient, create_project
    ) -> None:
        """A project override completely replaces the system default — no merge."""
        project_id = create_project("Replace Not Merge Project")
        seed_task_statuses = SEED_DEFAULTS["task_statuses"]
        override = ["only-this-value"]

        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": override},
        )
        data = _settings_data(response.json())

        # The seed default values must NOT appear alongside the override
        for seed_val in seed_task_statuses:
            assert seed_val not in data["task_statuses"], (
                f"Seed value '{seed_val}' should be replaced, not merged"
            )
        assert data["task_statuses"] == override, (
            f"Expected exact override {override}, got {data['task_statuses']}"
        )

    async def test_unknown_key_returns_422(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Unknown Key Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"unknown_key": ["a", "b"]},
        )
        assert response.status_code == 422, (
            f"Unknown key should return 422, got {response.status_code}"
        )

    async def test_empty_values_returns_400(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Empty Values Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": []},
        )
        assert response.status_code == 400, (
            f"Empty values should return 400, got {response.status_code}"
        )

    async def test_empty_values_verbatim_error_message(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Empty Values Error Msg Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_types": []},
        )
        body = response.json()
        assert body.get("error") == "Dictionary values cannot be empty.", (
            f"Expected verbatim error message, got: {body.get('error')}"
        )

    async def test_missing_project_returns_404(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.put(
            f"/v1/projects/{fake_id}/settings",
            json={"task_statuses": ["todo", "done"]},
        )
        assert response.status_code == 404, (
            f"Missing project should return 404, got {response.status_code}"
        )

    async def test_missing_project_error_code(self, client: AsyncClient) -> None:
        import uuid

        fake_id = str(uuid.uuid4())
        response = await client.put(
            f"/v1/projects/{fake_id}/settings",
            json={"task_statuses": ["todo", "done"]},
        )
        body = response.json()
        assert body.get("code") == "NOT_FOUND", (
            f"Expected NOT_FOUND, got {body.get('code')}"
        )

    async def test_no_keys_body_returns_effective_settings(
        self, client: AsyncClient, create_project
    ) -> None:
        """PUT with empty body asserts project exists and returns effective settings."""
        project_id = create_project("Empty Body PUT Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={},
        )
        assert response.status_code == 200, (
            f"Empty body should return 200, got {response.status_code}"
        )
        data = _settings_data(response.json())
        for key in ALL_KEYS:
            assert key in data, f"Missing key '{key}' in empty-body PUT response"


# ===========================================================================
# Cross-project isolation
# ===========================================================================


class TestCrossProjectIsolation:
    async def test_updating_one_project_override_does_not_affect_another(
        self, client: AsyncClient, create_project
    ) -> None:
        project_a = create_project("Project A")
        project_b = create_project("Project B")

        # Set override on project A
        await client.put(
            f"/v1/projects/{project_a}/settings",
            json={"task_statuses": ["a-todo", "a-done"]},
        )

        # Check project B effective settings — should still be seed defaults
        response = await client.get(f"/v1/projects/{project_b}/settings/effective")
        data = _settings_data(response.json())
        assert sorted(data["task_statuses"]) == sorted(
            SEED_DEFAULTS["task_statuses"]
        ), (
            f"Project B task_statuses should be system default, "
            f"got {data['task_statuses']}"
        )

    async def test_project_a_override_does_not_appear_in_project_b_overrides(
        self, client: AsyncClient, create_project
    ) -> None:
        project_a = create_project("Isolation Project A")
        project_b = create_project("Isolation Project B")

        await client.put(
            f"/v1/projects/{project_a}/settings",
            json={"link_types": [{"value": "custom-link", "outbound": "custom-link", "inbound": "custom-link"}]},
        )

        response = await client.get(f"/v1/projects/{project_b}/settings")
        data = _settings_data(response.json())
        assert data == {}, (
            f"Project B should have no overrides, got: {data}"
        )


# ===========================================================================
# Partial override — clearing behavior
# ===========================================================================


class TestPartialOverrideClearingBehavior:
    async def test_setting_second_override_does_not_clear_first(
        self, client: AsyncClient, create_project
    ) -> None:
        """Setting an override for key B must not remove the override for key A."""
        project_id = create_project("Multi-override Project")
        override_a = ["aa", "bb"]
        override_b = ["xx", "yy"]

        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": override_a},
        )
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_types": override_b},
        )

        response = await client.get(f"/v1/projects/{project_id}/settings")
        data = _settings_data(response.json())

        assert data.get("task_statuses") == override_a, (
            f"First override should still be present: expected {override_a}, "
            f"got {data.get('task_statuses')}"
        )
        assert data.get("task_types") == override_b, (
            f"Second override not stored: expected {override_b}, "
            f"got {data.get('task_types')}"
        )

    async def test_override_is_full_replace_not_append(
        self, client: AsyncClient, create_project
    ) -> None:
        """Re-setting an override for the same key replaces it, not appends."""
        project_id = create_project("Replace Override Project")

        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": ["first"]},
        )
        await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"task_statuses": ["second", "third"]},
        )

        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        assert data["task_statuses"] == ["second", "third"], (
            f"Override should be fully replaced, got {data['task_statuses']}"
        )
        assert "first" not in data["task_statuses"], (
            "Old override value should not persist after replace"
        )


# ===========================================================================
# attachment_types retirement — STORY-021 / TASK-002
# ===========================================================================


class TestAttachmentTypesRetired:
    """`attachment_types` was removed from ALL_DICT_KEYS entirely (STORY-021):
    it is no longer a recognized Settings dictionary key at either scope."""

    async def test_system_settings_get_has_no_attachment_types_key(
        self, client: AsyncClient
    ) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        assert "attachment_types" not in data, (
            f"attachment_types should be retired from system settings, got keys: {list(data)}"
        )

    async def test_system_settings_get_returns_exactly_five_keys(
        self, client: AsyncClient
    ) -> None:
        response = await client.get("/v1/system/settings")
        data = _settings_data(response.json())
        assert set(data.keys()) == ALL_KEYS, (
            f"Expected exactly the five keys {ALL_KEYS}, got {set(data.keys())}"
        )

    async def test_put_system_settings_with_attachment_types_returns_422(
        self, client: AsyncClient
    ) -> None:
        response = await client.put(
            "/v1/system/settings",
            json={"attachment_types": ["plan", "document"]},
        )
        assert response.status_code == 422, (
            f"attachment_types is an unknown key post-retirement, expected 422, "
            f"got {response.status_code} — {response.text}"
        )

    async def test_put_project_settings_with_attachment_types_returns_422(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Attachment Types Retired Project")
        response = await client.put(
            f"/v1/projects/{project_id}/settings",
            json={"attachment_types": ["plan", "document"]},
        )
        assert response.status_code == 422, (
            f"attachment_types is an unknown key post-retirement, expected 422, "
            f"got {response.status_code} — {response.text}"
        )

    async def test_project_effective_settings_has_no_attachment_types_key(
        self, client: AsyncClient, create_project
    ) -> None:
        project_id = create_project("Effective No Attachment Types Project")
        response = await client.get(f"/v1/projects/{project_id}/settings/effective")
        data = _settings_data(response.json())
        assert "attachment_types" not in data, (
            f"attachment_types should be retired from effective settings, got keys: {list(data)}"
        )
