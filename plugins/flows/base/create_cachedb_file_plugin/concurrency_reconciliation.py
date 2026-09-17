from datetime import datetime, timezone

from prefect.client.orchestration import get_client
from prefect.client.schemas.actions import GlobalConcurrencyLimitUpdate
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
    """Correct the real ``concurrency_limit_v2.active_slots`` counter for each tag.

    Prefect exposes tag concurrency occupancy through two independent stores: the
    ``active_slots`` integer that actually gates new task runs, and a separate lease
    list that every v1-compatible "active slots" view (CLI, UI, trex's own
    ``ensureConcurrencyLimit`` check) is built from instead. A task run that is hard
    killed (OOM, SIGKILL, Docker daemon restart) never transitions out of RUNNING, so
    nothing ever releases either one -- and because the two can drift apart
    independently, the lease-based view an operator would check can read 0 while the
    real counter stays stuck, which is exactly what leaves a schema or table copy
    parked forever with no error. This reads the task run table directly (bypassing
    the lease view), force-releases anything orphaned through Prefect's own
    state-transition path, and then corrects the real counter to match -- the same
    fix confirmed to work manually by deleting and recreating the limit, but without
    discarding a limit a genuinely concurrent run still needs.
    """
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
    if not task_runs:
        return

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

    if limit.active_slots != alive_count:
        logger.warning(
            f"Concurrency limit '{limit_name}' active_slots was {limit.active_slots}, "
            f"but only {alive_count} task run(s) tagged '{tag}' are genuinely still "
            f"RUNNING. Correcting active_slots to {alive_count} so new copies can proceed."
        )
        client.update_global_concurrency_limit(
            limit_name, GlobalConcurrencyLimitUpdate(active_slots=alive_count)
        )


def _is_orphaned(client, task_run, stale_after_seconds: int) -> bool:
    """A RUNNING task run is orphaned if its flow run is gone/terminal, or it has
    simply been RUNNING too long -- the fallback for when nothing ever reports the
    crash at all (e.g. the worker itself died in a Docker daemon restart)."""
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
        # Not fatal: this is the polite release path (fixes things when the lease is
        # still intact), but active_slots is corrected directly by the caller
        # regardless of whether this succeeds.
        logger.warning(
            f"Could not force-crash task run {task_run.id}: {exc}. Continuing -- "
            "the active_slots counter will still be corrected directly."
        )
