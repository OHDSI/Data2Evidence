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

# reticulate (R->python, used by ARTEMIS) classifies the pixi env as a conda
# environment (conda-meta/ present) and refuses it without a conda binary,
# silently falling back to a private uv python without our packages. A
# --system-site-packages venv wrapping the same interpreter reads as a plain
# virtualenv and inherits the full site-packages; RETICULATE_PYTHON points here.
if [ ! -x ".pixi/envs/default/reticulate-venv/bin/python" ]; then
  .pixi/envs/default/bin/python -m venv --system-site-packages .pixi/envs/default/reticulate-venv
fi
if [ ! -d node_modules/@synanetics/fhir-transform ]; then
  npm install --no-audit --no-fund @synanetics/fhir-transform@0.10.6
fi

# NER model packages for the `ner` environment. Both are pure-data spacy
# models whose declared spacy ranges are mutually exclusive (<3.8.0 vs
# >=3.8.14) — unlockable by any resolver — so they install --no-deps with
# pinned URLs + sha256, the semantics the previous image build used.
# Skipped until the ner environment exists (provisioned with the plugin).
NER_ENV_PIP=".pixi/envs/ner/bin/pip"
if [ -x "$NER_ENV_PIP" ] && ! .pixi/envs/ner/bin/python -c "import en_ner_bc5cdr_md, en_core_med7_trf" 2>/dev/null; then
  fetch_verified() { # url sha256 dest
    curl -fLsS --retry 5 -o "$3" "$1"
    echo "$2  $3" | sha256sum -c - >/dev/null
  }
  tmpdir="$(mktemp -d)"; trap 'rm -rf "$tmpdir"' EXIT
  fetch_verified \
    "https://s3-us-west-2.amazonaws.com/ai2-s2-scispacy/releases/v0.5.4/en_ner_bc5cdr_md-0.5.4.tar.gz" \
    "ffc73130a710edf851206199720cb2c744a043e032f5da6ba4bb36863deca778" \
    "$tmpdir/en_ner_bc5cdr_md-0.5.4.tar.gz"
  fetch_verified \
    "https://huggingface.co/kormilitzin/en_core_med7_trf/resolve/a24b622/en_core_med7_trf-1.1.0-py3-none-any.whl" \
    "a41478c1ceb7bdb2b6a8fb5b25e87bf759dc754e44f2ac6bbb866fdbdb40c7a6" \
    "$tmpdir/en_core_med7_trf-1.1.0-py3-none-any.whl"
  "$NER_ENV_PIP" install --no-deps \
    "$tmpdir/en_ner_bc5cdr_md-0.5.4.tar.gz" \
    "$tmpdir/en_core_med7_trf-1.1.0-py3-none-any.whl"
fi
