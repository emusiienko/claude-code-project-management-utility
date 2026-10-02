"""Integration tests for the Status domain — STORY-010 TASK-001.

Coverage zones (per TASK-003):
- GET /v1/status            happy path — liveness indicator + running application version
- Behaviors                 response carries no MCP-availability flag (status + version only)
- REST/MCP parity           MCP get_status returns the identical shape as REST GET /v1/status

Notes:
- The status operation is dependency-probe-free by design (see
  docs/stories/STORY-010-agent-access-mcp/implementation_plan.md) — there is no
  dependent service to fail, so there is no negative-path test here.
- Every test creates no data and does not depend on execution order.
"""

from fastmcp import Client
from httpx import AsyncClient

from app.mcp.server import mcp_server_v1

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

STATUS_URL = "/v1/status"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _mcp_call(tool_name: str, args: dict):
    async with Client(mcp_server_v1) as mcp_client:
        return await mcp_client.call_tool(tool_name, args)


# ===========================================================================
# GET /v1/status
# ===========================================================================


class TestGetStatus:
    async def test_get_status_returns_ok_and_version(self, client: AsyncClient) -> None:
        response = await client.get(STATUS_URL)
        assert (
            response.status_code == 200
        ), f"Status should return 200, got {response.status_code}"
        data = response.json()["data"]
        assert (
            data["status"] == "ok"
        ), f"status field should be 'ok', got '{data.get('status')}'"
        assert (
            isinstance(data["version"], str) and data["version"]
        ), f"version should be a non-empty string, got {data.get('version')!r}"

    async def test_get_status_carries_no_mcp_availability_flag(
        self, client: AsyncClient
    ) -> None:
        response = await client.get(STATUS_URL)
        data = response.json()["data"]
        assert set(data.keys()) == {"status", "version"}, (
            "Status response should carry exactly liveness + version — "
            f"no MCP-availability flag or extra fields, got keys {sorted(data.keys())}"
        )

    async def test_get_status_repeated_calls_return_the_same_version(
        self, client: AsyncClient
    ) -> None:
        first = (await client.get(STATUS_URL)).json()["data"]
        second = (await client.get(STATUS_URL)).json()["data"]
        assert (
            first["version"] == second["version"]
        ), "The application version should be stable across calls within one process"


# ===========================================================================
# REST / MCP parity
# ===========================================================================


class TestMcpParity:
    async def test_mcp_get_status_matches_rest(self, client: AsyncClient) -> None:
        rest_resp = await client.get(STATUS_URL)
        rest_data = rest_resp.json()["data"]

        result = await _mcp_call("get_status", {})
        mcp_data = result.data["data"]

        assert mcp_data == rest_data, (
            f"MCP get_status should return the identical shape as REST, "
            f"got MCP={mcp_data!r} REST={rest_data!r}"
        )
