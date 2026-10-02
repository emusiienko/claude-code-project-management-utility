"""Unit tests for app/core/database/types.py in isolation (no DB, no HTTP)."""

import datetime

import pytest

from app.core.database.types import UTCDateTime


class TestUTCDateTimeResultValue:
    def test_reattaches_utc_tzinfo_to_naive_result_value(self) -> None:
        # Mirrors SQLite's DATETIME result_processor, which always returns a
        # naive datetime regardless of what was stored.
        naive = datetime.datetime(2026, 10, 2, 12, 0, 0)

        result = UTCDateTime().process_result_value(naive, dialect=None)

        assert result == datetime.datetime(
            2026, 10, 2, 12, 0, 0, tzinfo=datetime.timezone.utc
        ), f"expected naive value reattached with UTC tzinfo, got {result!r}"

    def test_leaves_already_aware_result_value_untouched(self) -> None:
        # Mirrors PostgreSQL's TIMESTAMPTZ result_processor, which already
        # returns a timezone-aware datetime.
        aware = datetime.datetime(2026, 10, 2, 12, 0, 0, tzinfo=datetime.timezone.utc)

        result = UTCDateTime().process_result_value(aware, dialect=None)

        assert (
            result is aware
        ), f"expected an already tz-aware value to pass through unchanged, got {result!r}"

    def test_passes_none_through(self) -> None:
        assert UTCDateTime().process_result_value(None, dialect=None) is None


class TestUTCDateTimeBindParam:
    def test_normalizes_non_utc_aware_value_to_utc(self) -> None:
        plus_two = datetime.timezone(datetime.timedelta(hours=2))
        value = datetime.datetime(2026, 10, 2, 14, 0, 0, tzinfo=plus_two)

        result = UTCDateTime().process_bind_param(value, dialect=None)

        assert result == datetime.datetime(
            2026, 10, 2, 12, 0, 0, tzinfo=datetime.timezone.utc
        ), f"expected the value normalized to UTC before storage, got {result!r}"

    def test_rejects_naive_value(self) -> None:
        naive = datetime.datetime(2026, 10, 2, 12, 0, 0)

        with pytest.raises(ValueError):
            UTCDateTime().process_bind_param(naive, dialect=None)

    def test_passes_none_through(self) -> None:
        assert UTCDateTime().process_bind_param(None, dialect=None) is None
