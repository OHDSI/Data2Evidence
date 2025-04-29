import json
from re import match
from pathlib import Path

from .. import PLUGIN_VERSION # docs __init__.py

from prefect.utilities.callables import parameter_schema_from_entrypoint

# Constants - Do not overwrite
VALIDATION_PATTERN = r"^[A-Za-z0-9_]+$"
PACKAGE_PREFIX = "@data2evidence/"
REG_IMAGE_PREFIX = "ghcr.io/ohdsi/d2e/flow-"
LOCAL_IMAGE_PREFIX = "d2e/flow-"
LOCAL_IMAGE_TAG = ":local"


def generate_package_json(package_json_name: str, entrypoint: str, plugin_type: str = "", datamodels_str: str = ""):
    filepath = entrypoint.split(":")[0]
    flow_function = entrypoint.split(":")[-1]
    prefect_entrypoint = create_prefect_entrypoint(filepath, flow_function)

    plugin_group_folder = prefect_entrypoint.split(".")[0]
    plugin_name = prefect_entrypoint.split(".")[-1]

    # Check if there is an existing package.json
    package_json_path = Path(f'{plugin_group_folder}/package.json')

    if not package_json_path.exists():
        # Create a package.json in folder if it doesn't exist
        print(
            f"File '{package_json_path}' does not exist! Generating {package_json_path}...")
        package_json = get_template(
            package_json_name, plugin_group_folder)

    else:
        # Modify existing package.json
        # Package.json name will NOT be overwritten
        print(
            f"File '{package_json_path}' already exists! Modifying {package_json_path}...")
        with open(package_json_path, 'r') as file:
            package_json = json.load(file)

    datamodels = [dm.strip() for dm in datamodels_str.split(",")
                  ] if datamodels_str else None

    # Generate the openapi parameter schema of the entrypoint function
    parameter_schema = parameter_schema_from_entrypoint(
        str(Path.cwd() / entrypoint)).model_dump_for_openapi()

    # Check if existing flow plugin
    existing_plugin = check_plugin_exists(
        plugin_name, package_json["trex"]["flow"]["flows"])

    if not existing_plugin:
        print(f"'{plugin_name}' does not exist in this package.json! Adding '{plugin_name}'...")
        plugin_template = modify_plugin(
            {}, plugin_name, prefect_entrypoint, parameter_schema, plugin_type, datamodels)
        package_json["trex"]["flow"]["flows"].append(plugin_template)
    else:
        print(f"'{plugin_name}' already exists in this package.json! Modifying '{plugin_name}'...")
        for idx, plugin in enumerate(package_json["trex"]["flow"]["flows"]):
            if plugin["name"] == plugin_name:
                override = modify_plugin(plugin, plugin_name, prefect_entrypoint,
                                  parameter_schema, plugin_type, datamodels)
                package_json["trex"]["flow"]["flows"][idx].update(override)

    # Update package version
    package_json["version"] = PLUGIN_VERSION

    with open(package_json_path, 'w') as file:
        json.dump(package_json, file, indent=4) # needs to be indent 4 for json.load()


def check_plugin_exists(plugin_name: str, plugin_list: list) -> bool:
    return any(plugin['name'] == plugin_name for plugin in plugin_list)


def get_template(package_json_name: str, plugin_parent_folder: str) -> dict:

    registry_image_name = REG_IMAGE_PREFIX + plugin_parent_folder.replace("_", "-")
    local_image_name = LOCAL_IMAGE_PREFIX + plugin_parent_folder.replace("_", "-") + LOCAL_IMAGE_TAG

    return {
        "name": PACKAGE_PREFIX + package_json_name,
        "version": PLUGIN_VERSION,
        "description": "",
        "scripts": {
                "build": f"docker build ../ -f ./Dockerfile -t {local_image_name} --build-arg GITHUB_PAT=${{GITHUB_PAT}} --platform=linux/amd64"
        },
        "repository": {
            "type": "git",
            "url": "https://github.com/OHDSI/d2e.git"
        },
        "author": "",
        "license": "Apache-2.0",
        "bugs": {
            "url": "https://github.com/OHDSI/d2e/issues"
        },
        "homepage": "https://github.com/OHDSI/d2e/flows#readme",
        "trex": {
            "flow": {
                    "image": registry_image_name,
                    "flows": []
            }
        }
    }


def create_prefect_entrypoint(filepath: str, flow_function: str) -> str:
    import_path = ".".join(filepath.split(".")[:-1]).replace("/", ".")

    # Validate each path and function
    for path in import_path.split("."):
        assert match(VALIDATION_PATTERN, path), f"Invalid path: {path}"

    assert match(VALIDATION_PATTERN,
                 flow_function), f"Invalid function name: {flow_function}"

    return import_path + "." + flow_function


def modify_plugin(plugin: dict, plugin_name: str, prefect_entrypoint: str,
                  parameter_schema: dict, plugin_type: str = "", datamodels: list = []):
    plugin["name"] = plugin_name
    plugin["entrypoint"] = ".".join(
        ["flows"] + prefect_entrypoint.split(".")[1:])
    plugin["parameter_openapi_schema"] = parameter_schema
    plugin["type"] = "datamodel" if plugin_type == "datamodel" else plugin_type
    if plugin_type == "datamodel":
        plugin["datamodels"] = datamodels
    return plugin
