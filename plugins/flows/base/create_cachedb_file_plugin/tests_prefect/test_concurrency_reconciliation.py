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

from create_cachedb_file_plugin import concurrency_reconciliation as module
from create_cachedb_file_plugin.concurrency_reconciliation import (
    reconcile_stale_concurrency_slots,
)

TAG = "flow-level-concurrency"
LIMIT_NAME = f"tag:{TAG}"
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


def _client(running, counters, holders, flow_run=None, activity=()):
    """``running`` is the RUNNING-task-run list returned by each successive listing
    (the first is the orphan scan, the rest are occupant reads); ``activity`` is
    the newest task run of a flow run; ``counters`` and ``holders`` are the values
    of each successive counter / lease-holder read."""
    client = MagicMock()
    running_reads = iter(running)

    def read_task_runs(**kwargs):
        if "flow_run_filter" in kwargs:
            return list(activity)
        return next(running_reads)

    client.read_task_runs.side_effect = read_task_runs
    client.read_global_concurrency_limit_by_name.side_effect = [
        SimpleNamespace(active_slots=c) for c in counters
    ]
    client.read_concurrency_limit_by_tag.side_effect = [
        SimpleNamespace(active_slots=h) for h in holders
    ]
    if isinstance(flow_run, Exception):
        client.read_flow_run.side_effect = flow_run
    elif flow_run is not None:
        client.read_flow_run.return_value = flow_run
    return client


def _reconcile(client, lock=None):
    with patch.object(module, "get_client", return_value=client), patch.object(
        module, "concurrency", return_value=lock or MagicMock()
    ), patch.object(module.time, "sleep") as sleep:
        reconcile_stale_concurrency_slots([TAG], STALE_AFTER_SECONDS, MagicMock())
    return sleep


def _released(client):
    if not client.release_concurrency_slots.called:
        return None
    call = client.release_concurrency_slots.call_args
    assert call.kwargs["names"] == [LIMIT_NAME]
    return call.kwargs["slots"]


def test_healthy_holder_is_left_alone():
    alive = _task_run()
    client = _client(
        running=[[alive], [alive]],
        counters=[1],
        holders=[[alive.id]],
        flow_run=_flow_run(StateType.RUNNING),
    )

    sleep = _reconcile(client)

    client.set_task_run_state.assert_not_called()
    client.release_concurrency_slots.assert_not_called()
    sleep.assert_not_called()


def test_empty_tag_is_a_noop():
    client = _client(running=[[], []], counters=[0], holders=[[]])

    sleep = _reconcile(client)

    client.release_concurrency_slots.assert_not_called()
    sleep.assert_not_called()


def test_orphan_with_intact_lease_is_released_by_prefect_alone():
    orphan = _task_run()
    # Prefect's own release path decrements the counter when the orphan is crashed.
    client = _client(
        running=[[orphan], []],
        counters=[0],
        holders=[[]],
        flow_run=_flow_run(StateType.CRASHED),
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    assert client.set_task_run_state.call_args.kwargs["force"] is True
    client.release_concurrency_slots.assert_not_called()


def test_orphan_whose_lease_was_lost_gets_exactly_its_slot_released():
    orphan = _task_run()
    client = _client(
        running=[[orphan], [], []],
        counters=[1, 1],
        holders=[[], []],
        flow_run=_flow_run(StateType.FAILED),
    )

    sleep = _reconcile(client)

    client.set_task_run_state.assert_called_once()
    sleep.assert_called_once()
    assert _released(client) == 1


def test_missing_flow_run_is_treated_as_orphaned():
    orphan = _task_run()
    client = _client(
        running=[[orphan], [], []],
        counters=[1, 1],
        holders=[[], []],
        flow_run=ObjectNotFound(http_exc=Exception("404")),
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    assert _released(client) == 1


def test_idle_flow_run_is_orphaned_even_if_it_still_reads_running():
    stale = _task_run(age_seconds=STALE_AFTER_SECONDS + 100)
    client = _client(
        running=[[stale], [], []],
        counters=[1, 1],
        holders=[[], []],
        flow_run=_flow_run(StateType.RUNNING),
    )

    _reconcile(client)

    client.set_task_run_state.assert_called_once()
    assert _released(client) == 1


def test_long_running_copy_that_keeps_creating_chunk_tasks_is_never_released():
    """A 13+ hour copy is normal; the flow run is alive as long as it keeps
    starting new chunk task runs."""
    long_running = _task_run(age_seconds=13 * 3600)
    latest_chunk = _task_run(age_seconds=60)
    client = _client(
        running=[[long_running], [long_running]],
        counters=[1],
        holders=[[long_running.id]],
        flow_run=_flow_run(StateType.RUNNING),
        activity=[latest_chunk],
    )

    sleep = _reconcile(client)

    client.set_task_run_state.assert_not_called()
    client.release_concurrency_slots.assert_not_called()
    sleep.assert_not_called()


def test_young_running_task_without_a_lease_is_never_released():
    """Lease lost mid-run (e.g. server restart) but the task is genuinely alive."""
    alive = _task_run()
    client = _client(
        running=[[alive], [alive]],
        counters=[1],
        holders=[[]],
        flow_run=_flow_run(StateType.RUNNING),
    )

    sleep = _reconcile(client)

    client.set_task_run_state.assert_not_called()
    client.release_concurrency_slots.assert_not_called()
    sleep.assert_not_called()


def test_failed_force_crash_leaves_the_slot_alone():
    """The orphan is still listed RUNNING, so it still counts as an occupant."""
    orphan = _task_run()
    client = _client(
        running=[[orphan], [orphan]],
        counters=[1],
        holders=[[]],
        flow_run=_flow_run(StateType.CRASHED),
    )
    client.set_task_run_state.side_effect = Exception("server error")

    _reconcile(client)

    client.release_concurrency_slots.assert_not_called()


def test_ghost_slot_with_no_task_run_or_lease_is_released_after_confirmation():
    """Lease lost while the task ran, task later completed cleanly: nothing left
    to point at except the counter."""
    client = _client(running=[[], [], []], counters=[1, 1], holders=[[], []])

    sleep = _reconcile(client)

    sleep.assert_called_once()
    assert _released(client) == 1


def test_slot_acquired_between_observations_is_not_released():
    """The race reported in review: a task acquires the slot right after the first
    observation, so the counter is already incremented but its lease and RUNNING
    state only become visible in the second one."""
    fresh = _task_run()
    client = _client(
        running=[[], [], [fresh]],
        counters=[1, 1],
        holders=[[], [fresh.id]],
    )

    _reconcile(client)

    client.release_concurrency_slots.assert_not_called()


def test_slot_released_by_prefect_between_observations_is_not_released_again():
    client = _client(running=[[], [], []], counters=[1, 0], holders=[[], []])

    _reconcile(client)

    client.release_concurrency_slots.assert_not_called()


def test_concurrent_reconciler_holding_the_lock_skips_this_one():
    lock = MagicMock()
    lock.__enter__.side_effect = TimeoutError
    client = _client(running=[], counters=[], holders=[])

    _reconcile(client, lock=lock)

    client.read_task_runs.assert_not_called()
    client.release_concurrency_slots.assert_not_called()


def test_missing_limit_is_a_noop():
    client = MagicMock()
    client.read_task_runs.return_value = []
    client.read_global_concurrency_limit_by_name.side_effect = ObjectNotFound(
        http_exc=Exception("404")
    )

    _reconcile(client)

    client.release_concurrency_slots.assert_not_called()
