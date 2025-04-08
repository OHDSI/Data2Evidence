from prefect import task, runtime
from prefect_shell import ShellOperation
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact
import base64
import json
import os


@task(log_prints=True)
def generateDataJson(data, outputPath: str = "data.json"):
    with open(outputPath, 'w') as f:
        json.dump(data, f)


@task(log_prints=True)
def generateETLWordDocument(inputPath: str = "../../data.json", outputPath: str = "report.docx") -> None:
    logger = get_run_logger()

    if not os.path.exists(inputPath):
        raise Exception(f"file {inputPath} does not exist.")

    ShellOperation(
        commands=["Xvfb :1"]).trigger()

    ShellOperation(commands=[
                   f"./dist/bin/rabbitInAHat --generateWordReport {inputPath} {outputPath}"]).run()

    # finally generate markdown
    try:
        with open(outputPath, 'rb') as file:
            file_content = file.read()
            encoded_word_file = base64.b64encode(file_content).decode("utf-8")

        # Store Base64-encoded Word file as an artifact
        logger.info("Storing Base64-encoded Word file as artifact")
        create_markdown_artifact(
            key=f"{runtime.flow_run.id}-word-report",
            markdown=encoded_word_file,
            description="Base64 encoded Word report"
        )
        logger.info("Word document artifact stored successfully")

    except FileNotFoundError:
        logger.error("Generated Word document not found")
        raise
    except Exception as e:
        logger.error(f"Error processing Word document: {str(e)}")
        raise
