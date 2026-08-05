#!/usr/bin/env bash
# Plugin assets for cohort_discovery. Runs as the pixi `setup-assets` task at
# provisioning time, cwd = plugin dir.
#
# cohort_discovery has NO downloadable assets to stage: Hutch Bunny is pinned as
# a git pypi-dependency in pyproject.toml/pixi.lock (installed with the `bunny`
# env), and the dataset OMOP DB is reached at run time through Bunny's own DB
# client. This script exists only for parity with the other flow groups'
# provisioning contract and is intentionally a no-op.
set -euo pipefail
exit 0
