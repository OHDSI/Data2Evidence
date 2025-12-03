from prefect import flow, task
from prefect.logging import get_run_logger
import os
from .types import AdminSharePluginType
from _shared_flow_utils.api.PortalUserArtifactAPI import PortalUserArtifactAPI

os.environ['plugin_name'] = 'admin_share_plugin'


@task
def share_artifact_task(api: PortalUserArtifactAPI, service_name: str, artifact_id: int, shared: bool) -> dict:
    """
    Task to share or unshare a single artifact.

    Returns:
        dict with keys: 'success' (bool), 'service_name' (str), 'artifact_id' (int), 'error' (str or None)
    """
    logger = get_run_logger()
    try:
        result = api.share_artifact(service_name, artifact_id, shared)
        logger.info(f"Successfully {'shared' if shared else 'unshared'} {service_name}/{artifact_id}")
        return {
            'success': True,
            'service_name': service_name,
            'artifact_id': artifact_id,
            'error': None
        }
    except Exception as e:
        logger.error(f"Failed to {'share' if shared else 'unshare'} {service_name}/{artifact_id}: {str(e)}")
        return {
            'success': False,
            'service_name': service_name,
            'artifact_id': artifact_id,
            'error': str(e)
        }


@flow(log_prints=True)
def admin_share_plugin(options: AdminSharePluginType):
    """
    Flow to share or unshare multiple concept sets and cohort definitions (PA bookmarks).

    Args:
        options: AdminSharePluginType with:
            - concept_set_ids: Optional list of concept set IDs to share/unshare
            - cohort_definition_ids: Optional list of cohort definition (bookmark) IDs to share/unshare
            - shared: Boolean indicating whether to share (True) or unshare (False), defaults to True

    Returns:
        dict with keys:
            - 'concept_sets': list of results for concept sets
            - 'bookmarks': list of results for bookmarks
            - 'total_processed': total count of artifacts processed
            - 'total_success': count of successful operations
            - 'total_failed': count of failed operations
    """
    logger = get_run_logger()
    logger.info(f"Starting admin_share_plugin with shared={options.shared}")

    # Validate that at least one artifact type is specified
    if not options.concept_set_ids and not options.cohort_definition_ids:
        logger.warning("No artifacts specified for sharing")
        return {
            'concept_sets': [],
            'bookmarks': [],
            'total_processed': 0,
            'total_success': 0,
            'total_failed': 0
        }

    # Initialize API client
    api = PortalUserArtifactAPI()

    results = {
        'concept_sets': [],
        'bookmarks': [],
        'total_processed': 0,
        'total_success': 0,
        'total_failed': 0
    }

    # Process concept sets
    if options.concept_set_ids:
        logger.info(f"Processing {len(options.concept_set_ids)} concept sets")
        for concept_set_id in options.concept_set_ids:
            result = share_artifact_task(api, 'concept_sets', concept_set_id, options.shared)
            results['concept_sets'].append(result)
            results['total_processed'] += 1
            if result['success']:
                results['total_success'] += 1
            else:
                results['total_failed'] += 1

    # Process bookmarks (cohort definitions)
    if options.cohort_definition_ids:
        logger.info(f"Processing {len(options.cohort_definition_ids)} bookmarks")
        for bookmark_id in options.cohort_definition_ids:
            result = share_artifact_task(api, 'bookmarks', bookmark_id, options.shared)
            results['bookmarks'].append(result)
            results['total_processed'] += 1
            if result['success']:
                results['total_success'] += 1
            else:
                results['total_failed'] += 1

    # Log summary
    logger.info(f"Completed: {results['total_success']}/{results['total_processed']} successful, {results['total_failed']} failed")

    return results
