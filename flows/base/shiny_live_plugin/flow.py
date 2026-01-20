from prefect import flow, task
from prefect.logging import get_run_logger
import os
# from rpy2 import robjects
from prefect_shell import ShellOperation
from .types import ShinyLivePluginType

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
    build_shiny_live_assets(
        language=options.language,
        app_dir=app_dir
    )

    # run indefinitely to keep the flow active for checking the deployed app
    while True:
        continue

    return {
        'status': 'success',
        'dataset_id': options.dataset_id,
        'language': options.language
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
def build_shiny_live_assets(language: str, app_dir: str) -> None:
    """
    Build the Shiny Live application assets.

    Args:
        app_dir: str, path to the Shiny Live application directory
    """

    logger = get_run_logger()
    logger.info(f"Building Shiny Live app assets in {app_dir}...")

    if language == "r":
        r_script_path = os.path.join(
            os.path.dirname(__file__), "build_shiny_live.R")

        # TODO: Consider using rpy2 for better integration once this issuse is resolved:  https://github.com/rpy2/rpy2/issues/1121
        # with robjects.conversion.localconverter(robjects.default_converter):
        #     robjects.r(f"source('{r_script_path}')")
        #     build_shiny_live = robjects.r['build_shiny_live']
        #     build_shiny_live(appDir=app_dir, destDir=os.path.join(app_dir, "docs"))

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
