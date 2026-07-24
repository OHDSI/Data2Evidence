"""Runs inside the isolated Bunny 3.13 pixi env. Config comes from env (set by parent)."""
import json, sys, traceback

def _build_results_modifiers(settings):
    # Shape per BUNNY_NOTES.md (Task 1). Default mirrors Bunny CLI modifiers.
    return [
        {"id": "Low Number Suppression", "threshold": int(settings.LOW_NUMBER_SUPPRESSION_THRESHOLD)},
        {"id": "Rounding", "nearest": int(settings.ROUNDING_TARGET)},
    ]

def run() -> None:
    from hutch_bunny.core.settings import DaemonSettings
    from hutch_bunny.core.db import get_db_client
    from hutch_bunny.core.execute_query import execute_query
    from hutch_bunny.core.upstream.task_api_client import TaskApiClient
    from hutch_bunny.core.upstream.polling_service import PollingService

    settings = DaemonSettings()
    db_client = get_db_client()
    client = TaskApiClient(settings=settings)
    modifiers = _build_results_modifiers(settings)
    collected: list[dict] = []

    def handler(task_data: dict) -> None:
        result = execute_query(task_data, modifiers, db_client, settings)  # RquestResult
        client.send_results(result)                                        # submit to Relay
        d = result.to_dict()
        collected.append({
            "analysis": task_data.get("analysis"),
            "count": d.get("count"),
            "distributions": d.get("distributions", {}),
            "raw": d,
        })

    try:
        PollingService(client, handler, settings).poll_for_tasks(max_iterations=1)
        print(json.dumps({"results": collected, "error": None}))
    except Exception as exc:  # hard-fail: emit error JSON + non-zero exit
        print(json.dumps({"results": collected, "error": f"{type(exc).__name__}: {exc}"}))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    run()
