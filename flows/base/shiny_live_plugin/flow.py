from prefect import flow, task
from prefect.logging import get_run_logger
from prefect_shell import ShellOperation
import os
import shutil
# from rpy2 import robjects
from .types import ShinyLivePluginType

from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI


os.environ['plugin_name'] = 'shiny_live_plugin'


@flow(log_prints=True)
def shiny_live_plugin(options: ShinyLivePluginType):
    """
    Flow to deploy a Shiny Live application.

    Args:
        options: ShinyLivePluginType with:
            - dataset_id: str, identifier for the dataset to be used in the app 
            - language: FlowLanguageType, programming language of the app ("python" or "r")
            - app_code: str, the code of the Shiny Live application
    """

    logger = get_run_logger()
    logger.info(
        f"Building Shiny Live app for dataset {options.dataset_id} in {options.language}...")

    app_dir = create_shiny_live_folder(
        dataset_id=options.dataset_id,
        language=options.language,
        app_code=options.app_code
    )
    docs_dir = build_shiny_live_assets(
        language=options.language,
        app_dir=app_dir
    )
    zip_file_path = zip_shiny_live_assets(
        docs_dir=docs_dir,
        dataset_id=options.dataset_id,
        language=options.language
    )
    upload_result = upload_shiny_live_assets(
        dataset_id=options.dataset_id,
        zip_file_path=zip_file_path,
        config_type=options.config_type,
        name=options.name,
        language=options.language
    )

    return {
        'status': 'success',
        'dataset_id': options.dataset_id,
        'language': options.language,
        'zip_file_path': zip_file_path,
        'upload_result': upload_result
    }


@task(log_prints=True)
def create_shiny_live_folder(dataset_id: str, language: str, app_code: str) -> str:
    """
    Create a directory for the Shiny Live application.

    Args:
        dataset_id: str, identifier for the dataset
        app_code: str, the code of the Shiny Live application
    Returns:
        str: Path to the created Shiny Live application directory
    """

    logger = get_run_logger()

    app_dir = os.path.join("/tmp/shiny_live_app", dataset_id)

    try:
        os.makedirs(app_dir, exist_ok=True)
        logger.info(f"Created or verified directory {app_dir}")
    except Exception as e:
        logger.error(f"Failed to create directory {app_dir}: {e}")
        raise

    app_filename = "app.py" if language.lower() == "python" else "app.R"
    app_file_path = os.path.join(app_dir, app_filename)

    try:
        with open(app_file_path, "w") as app_file:
            app_file.write(app_code)
    except Exception as e:
        logger.error(f"Failed to write app file {app_file_path}: {e}")
        raise

    logger.info(f"Shiny Live app directory created at {app_dir}")
    return app_dir


@task(log_prints=True)
def build_shiny_live_assets(language: str, app_dir: str) -> str:
    """
    Build the Shiny Live application assets.

    Args:
        app_dir: str, path to the Shiny Live application directory

    Returns:
        str: Path to the built assets directory
    """

    logger = get_run_logger()
    logger.info(f"Building Shiny Live app assets in {app_dir}...")

    if language == "r":
        r_script_path = os.path.join(
            os.path.dirname(__file__), "build_shiny_live.R")

        # TODO: Consider using rpy2 for better integration once this issuse is resolved:  https://github.com/rpy2/rpy2/issues/1121
        logger.info(
            f"Running R script to build Shiny Live assets: {r_script_path}")
        logger.info(f"App directory: {app_dir}")
        ShellOperation(
            commands=[f"Rscript {r_script_path} '{app_dir}' '{os.path.join(app_dir, 'docs')}'"], stream_output=True).run()

    elif language == "python":
        logger.info("Building Python Shiny Live app assets...")
        ShellOperation(
            commands=[f"shinylive export '{app_dir}' '{os.path.join(app_dir, 'docs')}'"], stream_output=True).run()

    logger.info("Shiny Live app assets built successfully.")

    return os.path.join(app_dir, "docs")


@task(log_prints=True)
def zip_shiny_live_assets(docs_dir: str, dataset_id: str, language: str) -> str:
    """
    Zip the built Shiny Live assets directory.

    Args:
        docs_dir: str, path to the built assets directory
        dataset_id: str, identifier for the dataset
        language: str, programming language of the Shiny Live app
        config_type: str, configuration type of the Shiny Live app or Dashboard
        name: str, name of the Shiny Live app or Dashboard
    Returns:
        str: Path to the created zip file
    """

    logger = get_run_logger()
    logger.info(f"Zipping Shiny Live assets from {docs_dir}...")

    normalized_language = language.lower().replace('.', '_')
    zip_base_path = os.path.join(os.path.dirname(
        docs_dir), f"shiny_live_app_{dataset_id}_{normalized_language}")

    try:
        zip_file_path = shutil.make_archive(
            base_name=zip_base_path,
            format='zip',
            root_dir=docs_dir
        )
        logger.info(f"Created zip file: {zip_file_path}")
        return zip_file_path
    except Exception as e:
        logger.error(f"Failed to create zip file: {e}")
        raise


@task(log_prints=True)
def upload_shiny_live_assets(dataset_id: str, zip_file_path: str, config_type: str, name: str, language: str) -> dict:
    """
    Upload the zipped Shiny Live assets to Supabase storage.

    Args:
        dataset_id: str, identifier for the dataset
        zip_file_path: str, path to the zip file

    Returns:
        dict: Upload result from PortalServerAPI
    """

    logger = get_run_logger()
    logger.info(
        f"Uploading Shiny Live assets from {zip_file_path} to dataset {dataset_id}...")

    try:
        portal_api = PortalServerAPI()

        upload_result = portal_api.upload_dataset_file(
            datasetId=dataset_id,
            file_path=zip_file_path,
            content_type='application/zip',
            file_name=f"dashboard_{dataset_id}_{config_type}_{name}_{language.value}.zip"
        )

        logger.info(
            f"Successfully uploaded Shiny Live assets: {upload_result}")
        return upload_result
    except Exception as e:
        logger.error(f"Failed to upload Shiny Live assets: {e}")
        raise
