#!/usr/bin/env bash
# Plugin assets for data_transformation. Runs as the pixi `setup-assets` task
# at provisioning time, cwd = plugin dir.
# - @synanetics/fhir-transform: npm dependency of the dataflow-ui fhir nodes,
#   installed into <plugin>/node_modules with the env's nodejs.
# - WhiteRabbit dist: OPEN ITEM — today it is copied from the
#   ghcr.io/data2evidence/whiterabbit:master image stage; provisioning needs an
#   HTTP-fetchable artifact (publish the dist as a release tarball) or an OCI
#   fetch tool. Tracked in the migration plan (Task 3.1).
set -euo pipefail
if [ ! -d node_modules/@synanetics/fhir-transform ]; then
  npm install --no-audit --no-fund @synanetics/fhir-transform@0.10.6
fi
