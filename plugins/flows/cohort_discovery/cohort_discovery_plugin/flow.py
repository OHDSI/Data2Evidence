import os, json, subprocess
from datetime import datetime, timezone

from prefect import flow
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import CohortDiscoveryOptions, ChildResult, ArtifactEnvelope
from .bunny_config import build_bunny_env

os.environ["plugin_name"] = "cohort_discovery_plugin"

def _resolve_credentials(options: CohortDiscoveryOptions):
    """Resolve dataset DB/cachedb credentials via DBDao (3.12 parent). Returns (creds, schema).

    Real-attribute reconciliation (verified against
    `_shared_flow_utils/types.py::DBCredentialsType`): Postgres creds already
    expose exactly what `build_bunny_env` reads — `dialect`, `host`, `port`,
    `databaseName`, `user`, `password` (a SecretStr with `.get_secret_value()`)
    — so no shim is needed. There is NO dedicated DuckDB-path field on the
    credential type; for DuckDB the file path lives in `databaseName` (see
    `DaoBase.create_ibis_connection_url`, which builds `duckdb://{databaseName}`),
    so we expose it to `build_bunny_env` as `duckdb_path` via a small shim.
    """
    from types import SimpleNamespace

    from _shared_flow_utils.dao.DBDao import DBDao  # lazy: DBDao pulls in ibis, keep off module import path

    dao = DBDao(database_code=options.databaseCode, cache_id=options.cacheId or options.databaseCode)
    creds = dao.tenant_configs
    if str(getattr(creds, "dialect", "")).lower() == "duckdb":
        creds = SimpleNamespace(dialect=creds.dialect, duckdb_path=creds.databaseName)
    return creds, options.schemaName

def _run_child(env: dict[str, str]) -> str:
    """Invoke the Bunny child in its isolated 3.13 pixi env; return its stdout (last JSON line)."""
    proc = subprocess.run(
        ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"],
        env={**os.environ, **env}, capture_output=True, text=True,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        raise RuntimeError(f"Bunny child failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    return proc.stdout.strip().splitlines()[-1]

def _to_envelope(child: ChildResult, options: CohortDiscoveryOptions) -> ArtifactEnvelope:
    suppression = int(os.environ.get("LOW_NUMBER_SUPPRESSION_THRESHOLD", "10"))
    rounding = int(os.environ.get("ROUNDING_TARGET", "10"))
    availability = {"count": None, "obfuscation": {"suppression": suppression, "rounding": rounding}}
    distributions: dict = {}
    for r in child.results:
        if r.analysis is None:
            availability["count"] = r.count
        else:
            distributions.update(r.distributions or {})
    return ArtifactEnvelope(
        availability=availability,
        distributions=distributions,
        metadata={"datasetId": options.datasetId,
                  "cohortName": options.datasetId,
                  "generatedAt": datetime.now(timezone.utc).isoformat()},
    )

@flow(log_prints=True)
def cohort_discovery_plugin(options: CohortDiscoveryOptions) -> ArtifactEnvelope:
    logger = get_run_logger()
    logger.info(f"cohort_discovery start: dataset={options.datasetId}")

    creds, schema = _resolve_credentials(options)
    base_env = {k: os.environ[k] for k in (
        "TASK_API_BASE_URL", "TASK_API_USERNAME", "TASK_API_PASSWORD", "TASK_API_TYPE",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD", "ROUNDING_TARGET",
    ) if k in os.environ}
    env = build_bunny_env(creds, schema=schema, collection_id=options.datasetId, base_env=base_env)

    child = ChildResult.model_validate_json(_run_child(env))
    if child.error:
        raise RuntimeError(f"cohort_discovery hard-fail: {child.error}")

    envelope = _to_envelope(child, options)
    create_markdown_artifact(
        key="cohort-discovery-result",
        markdown=f"```json\n{json.dumps(envelope.model_dump(), indent=2)}\n```",
        description=f"Cohort discovery result for dataset {options.datasetId}",
    )
    logger.info(f"cohort_discovery done: availability={envelope.availability['count']}")
    return envelope
