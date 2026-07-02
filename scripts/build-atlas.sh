#!/usr/bin/env bash
# Build the Atlas plugin (and its in-repo Atlas3 sub-plugins) and stage the packed
# tarball into services/trex/plugin-artifacts/ so the trex image bakes it in via the
# existing plugin-artifacts extract step. Reproducible counterpart to the CI atlas job.
#
# The sub-plugins (jobs, network, notebook, results-viewer, strategus) live in the
# trex-notebook submodule (plugins/ui/libs/react-notebook) and are not published, so
# they are built from source here; plugins/atlas references them via file: deps.
#
# Requires a GitHub token with read:packages (public @ohdsi/atlas3, @ohdsi/atlas-ui,
# @ohdsi/pythia-* still need auth on GitHub Packages). Reads GITHUB_TOKEN or, locally,
# falls back to `gh auth token`.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SUBMODULE="plugins/ui/libs/react-notebook"
PLUGIN_DIR="$SUBMODULE/plugins"
ATLAS_DIR="plugins/atlas"
ARTIFACTS_DIR="services/trex/plugin-artifacts"

# Atlas3 sub-plugins built from the submodule (dir name under $PLUGIN_DIR).
SUBPLUGINS=(jobs network notebook-plugin results-viewer strategus)

: "${GITHUB_TOKEN:=$(gh auth token 2>/dev/null || true)}"
if [ -z "${GITHUB_TOKEN}" ]; then
  echo "[build-atlas] ERROR: GITHUB_TOKEN not set and 'gh auth token' unavailable." >&2
  echo "[build-atlas] A token with read:packages is required for @ohdsi GitHub Packages." >&2
  exit 1
fi
export GITHUB_TOKEN
export NODE_AUTH_TOKEN="$GITHUB_TOKEN"

echo "[build-atlas] Ensuring trex-notebook submodule is checked out..."
git submodule update --init --recursive "$SUBMODULE"

# notebook-plugin bundles source from the sibling notebook app, which imports `webr`;
# install the app's deps so that import resolves during the wrapper build.
if printf '%s\n' "${SUBPLUGINS[@]}" | grep -qx notebook-plugin; then
  echo "[build-atlas] Installing notebook app deps (provides webr for notebook-plugin)..."
  ( cd "$PLUGIN_DIR/notebook" && npm install )
fi

build_results_viewer_shinylive() {
  local dir="$PLUGIN_DIR/results-viewer"
  if ! command -v Rscript >/dev/null 2>&1; then
    echo "[build-atlas] WARN: Rscript not found; results-viewer shinylive export skipped." >&2
    [ "${SKIP_SHINYLIVE:-0}" = "1" ] && return 0
    echo "[build-atlas] ERROR: R toolchain required for the results-viewer viewer. Install R + shinylive, or set SKIP_SHINYLIVE=1 to build without it." >&2
    exit 1
  fi
  echo "[build-atlas] Building results-viewer shinylive export (R)..."
  ( cd "$dir" && Rscript scripts/build-shim-packages.R && Rscript scripts/build-shinylive-export.R )
}

for p in "${SUBPLUGINS[@]}"; do
  echo "[build-atlas] Building sub-plugin: $p"
  if [ "$p" = "results-viewer" ]; then
    build_results_viewer_shinylive
  fi
  ( cd "$PLUGIN_DIR/$p" && npm install && npm run build )
  if [ ! -f "$PLUGIN_DIR/$p/dist/index.system.js" ]; then
    echo "[build-atlas] ERROR: $p did not produce dist/index.system.js" >&2
    exit 1
  fi
done

echo "[build-atlas] Building the Atlas plugin (assembles Atlas3 + sub-plugin dists)..."
( cd "$ATLAS_DIR" && npm install && npm run build )

echo "[build-atlas] Packing Atlas plugin into $ARTIFACTS_DIR ..."
mkdir -p "$ARTIFACTS_DIR"
rm -f "$ARTIFACTS_DIR"/data2evidence-atlas-*.tgz
TARBALL="$(cd "$ATLAS_DIR" && npm pack --silent)"
mv "$ATLAS_DIR/$TARBALL" "$ARTIFACTS_DIR/"
echo "[build-atlas] Staged $ARTIFACTS_DIR/$TARBALL"
echo "[build-atlas] Done. Build the trex image to bake it in (docker compose build trex)."
