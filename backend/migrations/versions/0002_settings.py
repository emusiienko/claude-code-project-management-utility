"""Create system_settings and project_settings tables; seed default settings.

Revision ID: 0002_settings
Revises: 0001_project
Create Date: 2026-06-30

project_settings declares its FK to project inline. This is valid because
0001_project already created the project table — no deferred FK, no batch_alter_table.

Seed data (the six system-default dictionaries, plus the scalar
`default_web_ui_role` setting added by STORY-008/TASK-005) is bundled in the
same revision as the schema it populates. Timestamps are fixed for
determinism. STORY-008/TASK-005 edits this seed in place — the system is
confirmed pre-production, so the chain is re-run as a clean install rather
than patched with a backfill migration; `"operator"` is added to
`participant_roles` and seeded as the `default_web_ui_role` system default.
"""

from datetime import datetime, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_settings"
down_revision: Union[str, None] = "0001_project"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SEED_TIMESTAMP = datetime(2026, 6, 30, 0, 0, 0, tzinfo=timezone.utc)

# Default values are the canonical source from docs/architecture.md §Seed data.
_SEED_ROWS = [
    {
        "key": "task_statuses",
        "values": ["todo", "in-progress", "done"],
    },
    {
        "key": "task_types",
        "values": ["task", "bug", "testing-task"],
    },
    {
        "key": "story_statuses",
        "values": ["planned", "in-progress", "pending-approval", "accepted"],
    },
    {
        "key": "attachment_types",
        "values": [
            "plan",
            "document",
            "image",
            "implementation-report",
            "test-result",
            "external-ref",
        ],
    },
    {
        "key": "link_types",
        "values": [
            {"value": "depends-on", "outbound": "depends on", "inbound": "dependent"},
            {"value": "dependent", "outbound": "dependent", "inbound": "depends on"},
            {"value": "created-by", "outbound": "created by", "inbound": "creates"},
            {"value": "creates", "outbound": "creates", "inbound": "created by"},
            {"value": "context", "outbound": "context", "inbound": "context for"},
        ],
    },
    {
        "key": "participant_roles",
        "values": [
            "orchestrator",
            "architect",
            "backend-developer",
            "frontend-developer",
            "devops",
            "spec-writer",
            "qa-automation",
            "manual-qa",
            # "operator" represents the human orchestrator driving the Web UI —
            # distinct from the "orchestrator" agent-coordination role above.
            # Added by STORY-008/TASK-005.
            "operator",
        ],
    },
    {
        # Scalar setting (STORY-008/TASK-005) — the role the Web UI pre-fills on
        # any author/creator-style field it composes. Stored as a bare JSON
        # string, not a list, unlike every other row in this table.
        "key": "default_web_ui_role",
        "values": "operator",
    },
]


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(50), primary_key=True),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "project_settings",
        # project_id stores UUID portably: CHAR(36) on SQLite, native UUID on
        # PostgreSQL. The UUIDType custom type handles this at the ORM layer;
        # migrations use String(36) so both dialects accept the same DDL.
        sa.Column("project_id", sa.String(36), nullable=False),
        sa.Column("key", sa.String(50), nullable=False),
        sa.Column("values", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        # Inline FK — valid because project already exists from 0001_project.
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["project.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("project_id", "key"),
    )

    system_settings_table = sa.table(
        "system_settings",
        sa.column("key", sa.String),
        sa.column("values", sa.JSON),
        sa.column("updated_at", sa.DateTime),
    )
    op.bulk_insert(
        system_settings_table,
        [
            {
                "key": row["key"],
                "values": row["values"],
                "updated_at": _SEED_TIMESTAMP,
            }
            for row in _SEED_ROWS
        ],
    )


def downgrade() -> None:
    op.drop_table("project_settings")
    op.drop_table("system_settings")
