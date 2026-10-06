"""Every Alembic revision id must fit Alembic's `alembic_version.version_num` column.

Alembic creates that column as VARCHAR(32). PostgreSQL enforces the length, SQLite does
not, so an over-long id passes the SQLite suite and fails `alembic upgrade` on PostgreSQL
when the version row is written.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

ALEMBIC_INI = Path(__file__).parent.parent.parent / "alembic.ini"

# Width of alembic_version.version_num as created by Alembic (alembic.runtime.migration).
VERSION_NUM_MAX_LENGTH = 32


def _revisions() -> list[str]:
    script = ScriptDirectory.from_config(Config(str(ALEMBIC_INI)))
    return [rev.revision for rev in script.walk_revisions()]


def test_migrations_are_discovered() -> None:
    assert len(_revisions()) >= 15


@pytest.mark.parametrize("revision", _revisions())
def test_revision_id_fits_alembic_version_column(revision: str) -> None:
    assert len(revision) <= VERSION_NUM_MAX_LENGTH, (
        f"revision id {revision!r} is {len(revision)} chars; "
        f"alembic_version.version_num holds {VERSION_NUM_MAX_LENGTH}"
    )
