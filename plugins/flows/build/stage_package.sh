#!/usr/bin/env bash
# Stage the self-contained npm-package layout for a flow plugin group:
#   flows/<plugin>/       one dir per plugin named in trex.flow.flows entrypoints
#   _shared_flow_utils/   vendored copy of the shared package
#   __init__.py           parity with the runtime layout the flow images used
# Runs via npm lifecycle hooks (prepack/postpack) with cwd = the group dir.
# The package.json "files" allowlist limits the tarball to the staged layout
# plus manifests and lockfiles.
set -euo pipefail

if [ "${1:-}" = "clean" ]; then
  rm -rf flows _shared_flow_utils __init__.py
  exit 0
fi

rm -rf flows _shared_flow_utils __init__.py
mkdir -p flows

plugins=$(python3 - <<'EOF'
import json
pkg = json.load(open("package.json"))
names = set()
for f in pkg["trex"]["flow"]["flows"]:
    parts = f["entrypoint"].split(".")
    if parts[0] == "flows" and len(parts) > 2:
        names.add(parts[1])
print("\n".join(sorted(names)))
EOF
)

for p in $plugins; do
  if [ ! -d "$p" ]; then
    echo "ERROR: plugin dir '$p' (from package.json entrypoints) not found" >&2
    exit 1
  fi
  cp -a "$p" "flows/$p"
done

cp -a ../_shared_flow_utils _shared_flow_utils
cp ../__init__.py __init__.py
