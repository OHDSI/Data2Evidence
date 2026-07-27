import os, json, subprocess
from datetime import datetime, timezone

from prefect import flow
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import CohortDiscoveryOptions, ChildResult, ArtifactEnvelope
from .bunny_config import build_bunny_env

os.environ["plugin_name"] = "cohort_discovery_plugin"

def _resolve_credentials(options: CohortDiscoveryOptions):
    """Resolve creds via DBDao; returns (creds, schema, database).

    `database` is the name Bunny connects to. For `trex` that is the cachedb
    `cache_id` (the pgwire dbname Trex routes on); for a direct Postgres dataset
    it must be the credential's `databaseName` — `cache_id` defaults to
    `database_code` in `DaoBase`, which is not a database name.
    """
    from _shared_flow_utils.dao.DBDao import DBDao  # lazy: DBDao pulls in ibis, keep off module import path

    dao = DBDao(database_code=options.databaseCode, cache_id=options.cacheId or options.databaseCode)
    creds = dao.tenant_configs

    if str(getattr(creds, "dialect", "")).lower() == "trex":
        database = getattr(dao, "cache_id", None) or options.cacheId
    else:
        database = getattr(creds, "databaseName", None)
    return creds, options.schemaName, database

def _run_child(env: dict[str, str]) -> str:
    """Invoke the Bunny child in its isolated 3.13 pixi env; return its stdout (last JSON line)."""
    proc = subprocess.run(
        ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"],
        env={**os.environ, **env}, capture_output=True, text=True,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        raise RuntimeError(f"Bunny child failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    return proc.stdout.strip().splitlines()[-1]

def _to_envelope(child: ChildResult, options: CohortDiscoveryOptions,
                 errors: list | None = None) -> ArtifactEnvelope:
    suppression = int(os.environ.get("LOW_NUMBER_SUPPRESSION_THRESHOLD", "10"))
    rounding = int(os.environ.get("ROUNDING_TARGET", "10"))
    availability = {"count": None, "obfuscation": {"suppression": suppression, "rounding": rounding}}
    distributions: dict = {}
    for r in child.results:
        if r.analysis is None:
            availability["count"] = r.count
        else:
            # Bunny returns distribution payloads as files (base64 TSV), keyed
            # here by the task's distribution code.
            distributions[r.code or "UNKNOWN"] = r.files
    return ArtifactEnvelope(
        availability=availability,
        distributions=distributions,
        metadata={"datasetId": options.datasetId,
                  "cohortName": options.datasetId,
                  "generatedAt": datetime.now(timezone.utc).isoformat()},
        errors=errors or [],
    )

def _persist_artifact(envelope: ArtifactEnvelope, options: CohortDiscoveryOptions) -> None:
    create_markdown_artifact(
        key="cohort-discovery-result",
        markdown=f"```json\n{json.dumps(envelope.model_dump(), indent=2)}\n```",
        description=f"Cohort discovery result for dataset {options.datasetId}",
    )

@flow(log_prints=True)
def cohort_discovery_plugin(options: CohortDiscoveryOptions) -> ArtifactEnvelope:
    logger = get_run_logger()
    logger.info(f"cohort_discovery start: dataset={options.datasetId}")

    creds, schema, database = _resolve_credentials(options)
    base_env = {k: os.environ[k] for k in (
        "TASK_API_BASE_URL", "TASK_API_USERNAME", "TASK_API_PASSWORD", "TASK_API_TYPE",
        "TASK_API_ENFORCE_HTTPS",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD", "ROUNDING_TARGET",
    ) if k in os.environ}
    env = build_bunny_env(creds, schema=schema, collection_id=options.datasetId,
                          base_env=base_env, database=database)

    child = ChildResult.model_validate_json(_run_child(env))
    if child.error:
        # Persist the failure before raising so operators can inspect it in the
        # artifact rather than only in run logs.
        _persist_artifact(
            _to_envelope(child, options, errors=[{"code": "CHILD_FAILED", "detail": child.error}]),
            options,
        )
        raise RuntimeError(f"cohort_discovery hard-fail: {child.error}")

    envelope = _to_envelope(child, options)
    _persist_artifact(envelope, options)
    logger.info(f"cohort_discovery done: availability={envelope.availability['count']}")
    return envelope
