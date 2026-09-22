import time
from datetime import datetime, timezone

from prefect.client.orchestration import get_client
from prefect.client.schemas.filters import (
    FlowRunFilter,
    FlowRunFilterId,
    TaskRunFilter,
    TaskRunFilterState,
    TaskRunFilterStateType,
    TaskRunFilterTags,
)
from prefect.client.schemas.objects import TERMINAL_STATES, StateType
from prefect.client.schemas.sorting import TaskRunSort
from prefect.concurrency.sync import concurrency
from prefect.exceptions import ObjectNotFound
from prefect.states import Crashed

RECONCILE_LOCK = "cache-slot-reconcile"
LOCK_TIMEOUT_SECONDS = 120
CONFIRM_DELAY_SECONDS = 5


def reconcile_stale_concurrency_slots(tags: list[str], stale_after_seconds: int, logger) -> None:
    """Release concurrency slots leaked by task runs that were killed outright
    (OOM, SIGKILL, Docker daemon restart) or lost their lease mid-run, so a crashed
    copy doesn't permanently block every later one under the same tag.

    Reconcilers are serialized with a global lock. Orphaned task runs are released
    through Prefect's own state transition; a slot is only decremented directly when
    it is still unclaimed by any task run or lease across two observations. A task run
    counts as orphaned when its flow run has ended or has shown no task-run activity
    for ``stale_after_seconds``; long-running copies are not affected."""
    client = get_client(sync_client=True)
    client.upsert_global_concurrency_limit_by_name(
        RECONCILE_LOCK, limit=1, slot_decay_per_second=0.0
    )
    try:
        with concurrency(RECONCILE_LOCK, occupy=1, timeout_seconds=LOCK_TIMEOUT_SECONDS):
            for tag in tags:
                _reconcile_tag(client, tag, stale_after_seconds, logger)
    except TimeoutError:
        logger.warning("Another concurrency reconciliation is in progress; skipping this one.")


def _reconcile_tag(client, tag: str, stale_after_seconds: int, logger) -> None:
    for task_run in _running_task_runs(client, tag):
        if _is_orphaned(client, task_run, stale_after_seconds):
            _force_release(client, task_run, tag, logger)

    leaked = _unaccounted_slots(client, tag)
    if leaked <= 0:
        return

    # A slot acquired moments ago is counted before its lease and RUNNING state
    # exist; only a slot that is still unclaimed after a delay is a leak.
    time.sleep(CONFIRM_DELAY_SECONDS)
    leaked = min(leaked, _unaccounted_slots(client, tag))
    if leaked <= 0:
        return

    limit_name = f"tag:{tag}"
    logger.warning(
        f"Concurrency limit '{limit_name}' holds {leaked} slot(s) that no task run or "
        "lease claims. Releasing them so new copies can proceed."
    )
    client.release_concurrency_slots(names=[limit_name], slots=leaked, occupancy_seconds=1.0)


def _running_task_runs(client, tag: str) -> list:
    return client.read_task_runs(
        task_run_filter=TaskRunFilter(
            tags=TaskRunFilterTags(all_=[tag]),
            state=TaskRunFilterState(
                type=TaskRunFilterStateType(any_=[StateType.RUNNING]), name=None
            ),
        )
    )


def _unaccounted_slots(client, tag: str) -> int:
    # Counter is read before the occupants: anything that acquires afterwards shows
    # up as an occupant, which can only shrink the result, never inflate it.
    try:
        counter = client.read_global_concurrency_limit_by_name(f"tag:{tag}").active_slots
        lease_holders = client.read_concurrency_limit_by_tag(tag).active_slots
    except ObjectNotFound:
        return 0
    running = {task_run.id for task_run in _running_task_runs(client, tag)}
    return counter - len(running | set(lease_holders))


def _is_orphaned(client, task_run, stale_after_seconds: int) -> bool:
    try:
        flow_run = client.read_flow_run(task_run.flow_run_id)
    except ObjectNotFound:
        return True

    if flow_run.state and flow_run.state.type in TERMINAL_STATES:
        return True

    last_activity = _last_activity(client, task_run)
    if last_activity is None:
        return False

    idle_seconds = (datetime.now(timezone.utc) - last_activity).total_seconds()
    return idle_seconds > stale_after_seconds


def _last_activity(client, task_run):
    # A long copy keeps creating chunk task runs in its flow run, so "running for
    # 13 hours" is normal; only a flow run that has gone quiet is presumed dead.
    newest = client.read_task_runs(
        flow_run_filter=FlowRunFilter(id=FlowRunFilterId(any_=[task_run.flow_run_id])),
        sort=TaskRunSort.EXPECTED_START_TIME_DESC,
        limit=1,
    )
    timestamps = [t.state.timestamp for t in [task_run, *newest] if t.state]
    return max(timestamps) if timestamps else None


def _force_release(client, task_run, tag: str, logger) -> None:
    logger.warning(
        f"Task run {task_run.id} ('{task_run.name}') is stuck RUNNING under tag "
        f"'{tag}' with an orphaned or stale parent flow run; forcing it to Crashed "
        "to release its concurrency slot."
    )
    try:
        client.set_task_run_state(
            task_run.id,
            Crashed(
                message="Force-released by reconcile_stale_concurrency_slots: "
                "parent flow run is gone/terminal or the task run has been stuck too long."
            ),
            force=True,
        )
    except Exception as exc:
        logger.warning(f"Could not force-crash task run {task_run.id}: {exc}")
