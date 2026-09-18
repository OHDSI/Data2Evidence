from datetime import datetime, timezone

from prefect.client.orchestration import get_client
from prefect.client.schemas.filters import (
    TaskRunFilter,
    TaskRunFilterState,
    TaskRunFilterStateType,
    TaskRunFilterTags,
)
from prefect.client.schemas.objects import TERMINAL_STATES, StateType
from prefect.exceptions import ObjectNotFound
from prefect.states import Crashed


def reconcile_stale_concurrency_slots(tags: list[str], stale_after_seconds: int, logger) -> None:
    """Release concurrency slots leaked by task runs that were killed outright
    (OOM, SIGKILL, Docker daemon restart) or lost their lease mid-run, so a crashed
    copy doesn't permanently block every later one under the same tag."""
    client = get_client(sync_client=True)
    for tag in tags:
        _reconcile_tag(client, tag, stale_after_seconds, logger)


def _reconcile_tag(client, tag: str, stale_after_seconds: int, logger) -> None:
    task_runs = client.read_task_runs(
        task_run_filter=TaskRunFilter(
            tags=TaskRunFilterTags(all_=[tag]),
            state=TaskRunFilterState(
                type=TaskRunFilterStateType(any_=[StateType.RUNNING]), name=None
            ),
        )
    )

    alive_count = 0
    for task_run in task_runs:
        if _is_orphaned(client, task_run, stale_after_seconds):
            _force_release(client, task_run, tag, logger)
        else:
            alive_count += 1

    limit_name = f"tag:{tag}"
    try:
        limit = client.read_global_concurrency_limit_by_name(limit_name)
    except ObjectNotFound:
        return

    excess = limit.active_slots - alive_count
    if excess > 0:
        logger.warning(
            f"Concurrency limit '{limit_name}' active_slots was {limit.active_slots}, "
            f"but only {alive_count} task run(s) tagged '{tag}' are genuinely still "
            f"RUNNING. Releasing {excess} leaked slot(s) so new copies can proceed."
        )
        client.release_concurrency_slots(
            names=[limit_name], slots=excess, occupancy_seconds=1.0
        )


def _is_orphaned(client, task_run, stale_after_seconds: int) -> bool:
    try:
        flow_run = client.read_flow_run(task_run.flow_run_id)
    except ObjectNotFound:
        return True

    if flow_run.state and flow_run.state.type in TERMINAL_STATES:
        return True

    state_timestamp = task_run.state.timestamp if task_run.state else None
    if state_timestamp is None:
        return False

    age_seconds = (datetime.now(timezone.utc) - state_timestamp).total_seconds()
    return age_seconds > stale_after_seconds


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
