import argparse


from docs.scripts.generatespec import generate_openapi_spec
from docs.scripts.packageutils import generate_package_json

# Usage:
# python flowinit.py --help
# python flowinit.py package_json_name path/to/flow.py:function plugin_type


def cli():
    parser = argparse.ArgumentParser(
        description="Command Line Interface for ..."
    )

    parser.add_argument(
        "package_json_name", type=str,
        help="Name of package.json to generate. Will not override an existing package.json name."
    )

    parser.add_argument(
        "entrypoint", type=str,
        help="""Path to entrypoint flow function. Should be in the format path/to/entrypoint/file.py:function 
        e.g. testflow/testplugin/flow.py:hello_world"""
    )

    parser.add_argument(
        "plugin_type", type=str,
        help="Plugin type. If datamodel plugin, use 'datamodel'"
    )

    parser.add_argument("-dm", "--datamodels", type=str,
                        help="Comma separated string of data models e.g. datamodel_1,datamodel_2. Defaults to empty list.")

    return parser.parse_args()


if __name__ == "__main__":
    args = cli()
    generate_package_json(args.package_json_name,
                          args.entrypoint, args.plugin_type, args.datamodels)
    generate_openapi_spec()