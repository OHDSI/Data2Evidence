#!/usr/bin/env bash
# Plugin asset: i2b2-data source tree (ant build scripts for datamodel creation).
# Runs as the pixi `setup-assets` task at provisioning time, cwd = plugin dir.
# No checksum: GitHub source archives for tags are not guaranteed byte-stable
# (parity with the previous Dockerfile, which also pinned only the tag).
set -euo pipefail
TAG="1.8.1.0001"
# The flow chdirs into flows/i2b2_plugin/i2b2_data and resolves the ant tree
# relative to that cwd (setup_plugin/path_to_ant in i2b2_plugin/flow.py).
DEST="flows/i2b2_plugin/i2b2_data"
[ -d "$DEST/i2b2-data-$TAG" ] && exit 0
mkdir -p "$DEST"
curl -fLsS --retry 3 -o "v$TAG.tar.gz" "https://github.com/i2b2/i2b2-data/archive/refs/tags/v$TAG.tar.gz"
tar -xzf "v$TAG.tar.gz" -C "$DEST"
rm "v$TAG.tar.gz"
