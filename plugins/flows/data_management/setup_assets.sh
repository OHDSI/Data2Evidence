#!/usr/bin/env bash
# Plugin asset: Liquibase CLI (datamodel changelogs). Runs as the pixi
# `setup-assets` task at provisioning time, cwd = plugin dir. The flow resolves
# the binary via the `liquibase_path` Prefect variable, defaulting to
# <cwd>/liquibase/liquibase.
set -euo pipefail
VERSION="4.5.0"
[ -x "liquibase/liquibase" ] && exit 0
curl -fLsS --retry 3 -o liquibase.tgz \
  "https://github.com/liquibase/liquibase/releases/download/v${VERSION}/liquibase-${VERSION}.tar.gz"
mkdir -p liquibase
tar -xzf liquibase.tgz -C liquibase
rm liquibase.tgz
