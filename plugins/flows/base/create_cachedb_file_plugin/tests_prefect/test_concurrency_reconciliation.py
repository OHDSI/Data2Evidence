"""Unit tests for reconciling leaked tag concurrency slots.

Lives outside ``tests/`` deliberately: that suite's own tests assert
``"prefect" not in sys.modules`` after importing the pure planner modules, to
guarantee it stays runnable in a venv with no prefect installed at all (see
``tests/README.md``). This module has to import prefect's real client/schema
classes to be worth anything, so importing it in the same pytest session as
``tests/`` would poison ``sys.modules`` for those checks even though nothing
under test actually violates the import discipline. Run separately, with
prefect installed (it's already this package's own pyproject dependency):

    PYTHONPATH="$PWD:$PWD/.." pytest create_cachedb_file_plugin/tests_prefect/ -v

``pytest.importorskip`` is kept anyway so an accidental `pytest .` from the
package root skips this cleanly instead of failing on a missing import.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

pytest.importorskip("prefect")

from prefect.client.schemas.objects import StateType
from prefect.exceptions import ObjectNotFound

from create_cachedb_file_plugin.concurrency_reconciliation import (
    reconcile_stale_concurrency_slots,
)

TAG = "flow-level-concurrency"
STALE_AFTER_SECONDS = 3600


def _task_run(age_seconds=10):
    return SimpleNamespace(
        id=uuid4(),
        name="create_schema_tables_from_cdmdefault",
        flow_run_id=uuid4(),
        state=SimpleNamespace(
            type=StateType.RUNNING,
            timestamp=datetime.now(timezone.utc) - timedelta(seconds=age_seconds),
        ),
    )


def _flow_run(state_type):
    return SimpleNamespace(state=SimpleNamespace(type=state_type))


def _client(task_runs, flow_run_or_exc, active_slots):
    client = MagicMock()
    client.read_task_runs.return_value = task_runs
    if isinstance(flow_run_or_exc, Exception):
        client.read_flow_run.side_effect = flow_run_or_exc
    else:
        client.read_flow_run.return_value = flow_run_or_exc
    client.read_global_concurrency_limit_by_name.return_value = SimpleNamespace(
        active_slots=active_slots
    )
    return client


def _reconcile(client):
    with patch(
        "create_cachedb_file_plugin.concurrency_reconciliation.get_client",
        return_value=client,
    ):
        reconcile_stale_concurrency_slots([TAG], STALE_AFTER_SECONDS, MagicMock())


def test_counter_already_matches_alive_holder_is_left_alone():
    client = _client(
        task_runs=[_task_run(age_seconds=10)],
        flow_run_or_exc=_flow_run(StateType.RUNNING),
        active_slots=1,
    )

    _reconcile(client)

    client.set_task_run_state.assert_not_called()
    client.update_global_concurrency_limit.assert_not_called()


def test_terminal_flow_run_forces_release_and_corrects_stuck_counter():
    client = _client(
        task_runs=[_task_run(age_seconds=10)],
        flow_run_or_exc=_flow_run(StateType.CRASHED),
        active_slots=1,
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    assert client.set_task_run_state.call_args.kwargs["force"] is True
    client.update_global_concurrency_limit.assert_called_once()
    name, update = client.update_global_concurrency_limit.call_args.args
    assert name == f"tag:{TAG}"
    assert update.active_slots == 0


def test_force_release_failure_still_corrects_the_counter():
    """Regression test for the production scenario: the lease behind the stuck
    task run is already gone (e.g. wiped by a lease-storage/server restart), so
    the polite force-crash finds nothing to reconcile server-side -- but the
    real ``active_slots`` counter must still be corrected directly."""
    client = _client(
        task_runs=[_task_run(age_seconds=10)],
        flow_run_or_exc=_flow_run(StateType.FAILED),
        active_slots=1,
    )
    client.set_task_run_state.side_effect = Exception("lease already gone")

    _reconcile(client)

    client.update_global_concurrency_limit.assert_called_once()
    _, update = client.update_global_concurrency_limit.call_args.args
    assert update.active_slots == 0


def test_missing_flow_run_is_treated_as_orphaned():
    client = _client(
        task_runs=[_task_run(age_seconds=10)],
        flow_run_or_exc=ObjectNotFound(http_exc=Exception("404")),
        active_slots=1,
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    client.update_global_concurrency_limit.assert_called_once()
    _, update = client.update_global_concurrency_limit.call_args.args
    assert update.active_slots == 0


def test_young_running_flow_run_is_not_orphaned():
    """A real concurrent run must never be starved by the reconciliation."""
    client = _client(
        task_runs=[_task_run(age_seconds=10)],
        flow_run_or_exc=_flow_run(StateType.RUNNING),
        active_slots=1,
    )

    _reconcile(client)

    client.set_task_run_state.assert_not_called()
    client.update_global_concurrency_limit.assert_not_called()


def test_stale_task_run_is_orphaned_even_if_flow_run_still_reads_running():
    """Fallback for when nothing ever reports the crash at all."""
    client = _client(
        task_runs=[_task_run(age_seconds=STALE_AFTER_SECONDS + 100)],
        flow_run_or_exc=_flow_run(StateType.RUNNING),
        active_slots=1,
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    client.update_global_concurrency_limit.assert_called_once()
    _, update = client.update_global_concurrency_limit.call_args.args
    assert update.active_slots == 0


def test_no_running_task_runs_is_a_noop():
    client = _client(task_runs=[], flow_run_or_exc=_flow_run(StateType.RUNNING), active_slots=0)

    _reconcile(client)

    client.read_global_concurrency_limit_by_name.assert_not_called()
    client.set_task_run_state.assert_not_called()
    client.update_global_concurrency_limit.assert_not_called()
