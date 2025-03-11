from prefect import flow, task, runtime
from prefect.artifacts import create_markdown_artifact
import json
from prefect.logging import get_run_logger
from flows.perseus_plugin.Perseus import Perseus
from flows.perseus_plugin.types import PerseusRequestType


@task(log_prints=True)
def setup_plugin(perseus: Perseus):
    perseus.start()
    return perseus


@flow(log_prints=True)
def perseus_plugin(options: PerseusRequestType):
    logger = get_run_logger()
    logger.info("triggering perseus flow")
    perseus = Perseus()
    setup_plugin(perseus)

    try:
        result = perseus.handle_request(options)
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"Perseus failed to complete request, {result.content}")

        if 'json' in result.headers.get("content-type").lower():
            result = result.json()
    except Exception as e:
        logger.error(f"Perseus failed to complete request, {e}")
        raise Exception(e)

    if "create_source_schema_by_scan_report" in options.url:
        return create_markdown_artifact(
            key=runtime.flow_run.id,
            markdown=json.dumps(result),
            description="JSON data stored as a Markdown artifact"
        )

    return
