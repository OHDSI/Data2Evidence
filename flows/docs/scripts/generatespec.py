import json
import uvicorn
from pathlib import Path

from .. import PLUGIN_VERSION # from docs __init__.py

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.docs import get_swagger_ui_html

# Run python generatespec.py and go to HOST:PORT/docs in browser
HOST = "127.0.0.1"
PORT = 8200
TITLE = "D2E Flows"


def update_definition(definition: any):
    if isinstance(definition, dict):
        string_definition = json.dumps(definition)
        updated_json_string = string_definition.replace(
            "definitions", "components/schemas")
        return json.loads(updated_json_string)
    else:
        return definition


def convert_to_camel_case(flow_name: str) -> str:
    words = flow_name.split('_')
    return ''.join(word.capitalize() for word in words)


def create_temp_function(flow_name: str):
    # Create a fake function to register as a route
    def temp_fn():
        pass
    temp_fn.__name__ = flow_name
    return temp_fn


def create_route(flow_path: str, flow_name: str, tags: list[str]):
    # Tags used to group flows within the same folder
    app.add_api_route(flow_path, create_temp_function(
        flow_name), methods=["POST"], tags=tags)


def custom_openapi():
    if app.openapi_schema:
        print(f"Using existing openapi spec...")
        return app.openapi_schema
    print(f"Creating new openapi spec...")
    openapi_schema = get_openapi(
        title=TITLE,
        version=PLUGIN_VERSION,
        routes=app.routes
    )

    # Add the parameter schema for each flow here since temp function is generated with no parameters
    if openapi_schema.get("components") is None:
        openapi_schema["components"] = {
            "schemas": {}
        }

    for path, params in flow_parameters.items():
        flow_options_name = convert_to_camel_case(path[1:]) + "Options"

        openapi_schema["paths"][path]["post"]["requestBody"] = {
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": f"#/components/schemas/{flow_options_name}"
                    }
                }
            }
        }

        openapi_schema["components"]["schemas"][flow_options_name] = params
        openapi_schema["components"]["schemas"][flow_options_name]["title"] = flow_options_name
        try:
            # Register each pydantic model defined as its own schema
            options_definition = openapi_schema["components"]["schemas"][
                flow_options_name]["properties"]["options"]["$ref"]

            openapi_schema["components"]["schemas"][flow_options_name]["properties"]["options"]["$ref"] = options_definition.replace(
                "definitions", f"components/schemas")

            models = openapi_schema["components"]["schemas"][flow_options_name]["definitions"]

            for model, definition in models.items():
                openapi_schema["components"]["schemas"][model] = update_definition(
                    definition)

        except KeyError as e:
            print(f"Error creating schema for model {model}", e)

    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Disable default CDN for self hosting and use static files for js, css
app = FastAPI(docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory="docs/static"), name="static")
root_dir = Path(".")
flow_parameters = {}


@app.get("/docs", include_in_schema=False)
def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title,
        # custom cdn url where the html gets the js file
        swagger_js_url="/static/swagger-ui-bundle.js",
        # custom cdn url where the html gets the css file
        swagger_css_url="/static/swagger-ui.css"
    )


# Iterate through all flow package.json in flows folder and extract flow_name, parameters
for file_path in list(root_dir.rglob('package.json')):
    if file_path.is_file() and file_path.parent != root_dir:
        folder = file_path.parent
        with open(file_path, "r") as f:
            flows = json.load(f)["trex"]["flow"]["flows"]
            for flow in flows:
                flow_name = flow.get("name")
                flow_path = "/" + flow_name
                flow_parameters[flow_path] = flow.get(
                    "parameter_openapi_schema")

                # register temporary routes based on flow functions
                create_route(flow_path, flow_name, [str(folder)])


def generate_openapi_spec():
    # Edit the open api spec to add parameter schema for each flow
    app.openapi = custom_openapi

    html_content = get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )
    with open('docs/index.html', 'w') as f:
        f.write(html_content.body.decode("utf-8"))

    # Comment out to see UI
    # uvicorn.run(app, host=HOST, port=PORT)
