"""Convert link_types dictionary entries from flat strings to structured objects.

Revision ID: 0008_link_types_structured
Revises: 0007_story_link
Create Date: 2026-07-13

Upgrade converts every system_settings and project_settings row where
key = 'link_types' from a flat-string array to a structured-object array.
Each string entry becomes {"value": s, "outbound": <label>, "inbound": <label>}.

Canonical labels for the five known slugs are hardcoded; any other slug uses
a best-effort derivation (hyphens replaced by spaces) for both outbound and
inbound labels — users can edit them afterward.

Already-structured entries (dicts with 'value'/'outbound'/'inbound' keys) are
left unchanged so the upgrade is idempotent.

Downgrade collapses each structured object back to its 'value' string only.
"""

import json
from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_link_types_structured"
down_revision: Union[str, None] = "0007_story_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Canonical directional labels for the five known link-type slugs.
# Values outside this map fall back to hyphen→space derivation for both fields.
_CANONICAL_LABELS: dict[str, tuple[str, str]] = {
    "depends-on": ("depends on", "dependent"),
    "dependent": ("dependent", "depends on"),
    "created-by": ("created by", "creates"),
    "creates": ("creates", "created by"),
    "context": ("context", "context for"),
}


def _to_structured(entry: object) -> dict:
    # Convert a single entry (either already a dict or a plain string) into the
    # canonical {"value", "outbound", "inbound"} shape.
    if isinstance(entry, dict) and {"value", "outbound", "inbound"} <= entry.keys():
        # Already structured — idempotent guard.
        return entry
    if isinstance(entry, str):
        slug = entry
        outbound, inbound = _CANONICAL_LABELS.get(
            slug, (slug.replace("-", " "), slug.replace("-", " "))
        )
        return {"value": slug, "outbound": outbound, "inbound": inbound}
    # Malformed entry — preserve as-is so the migration does not destroy data.
    return entry  # type: ignore[return-value]


def _to_flat(entry: object) -> str:
    # Collapse a structured object back to its value string.
    if isinstance(entry, dict) and "value" in entry:
        return entry["value"]
    if isinstance(entry, str):
        return entry
    return str(entry)


def _fetch_link_types_rows(
    connection: sa.engine.Connection, table_name: str
) -> list[Any]:
    # Quote `values` to avoid conflict with the SQLite reserved keyword.
    # Double-quote syntax is ANSI SQL and valid on both SQLite and PostgreSQL.
    result = connection.execute(
        sa.text(
            f"SELECT key, \"values\" FROM {table_name} WHERE key = 'link_types'"
        )  # noqa: S608
    )
    return list(result.fetchall())


def _write_link_types(
    connection: sa.engine.Connection, table_name: str, converted: list
) -> None:
    connection.execute(
        sa.text(
            f"UPDATE {table_name} SET \"values\" = :v WHERE key = 'link_types'"
        ),  # noqa: S608
        {"v": json.dumps(converted)},
    )


def _convert_rows(connection: sa.engine.Connection, table_name: str) -> None:
    # Fetch all link_types rows from the given table, convert, write back.
    rows = _fetch_link_types_rows(connection, table_name)
    for row in rows:
        raw_val = row[1]
        raw: list = raw_val if isinstance(raw_val, list) else json.loads(raw_val)
        converted = [_to_structured(entry) for entry in raw]
        _write_link_types(connection, table_name, converted)


def _revert_rows(connection: sa.engine.Connection, table_name: str) -> None:
    rows = _fetch_link_types_rows(connection, table_name)
    for row in rows:
        raw_val = row[1]
        raw: list = raw_val if isinstance(raw_val, list) else json.loads(raw_val)
        flat = [_to_flat(entry) for entry in raw]
        _write_link_types(connection, table_name, flat)


def upgrade() -> None:
    bind = op.get_bind()
    _convert_rows(bind, "system_settings")
    _convert_rows(bind, "project_settings")


def downgrade() -> None:
    bind = op.get_bind()
    _revert_rows(bind, "system_settings")
    _revert_rows(bind, "project_settings")
