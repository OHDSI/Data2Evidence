#!/usr/bin/env bash
#
# Refresh the Playwright screenshot baselines the way CI renders them.
#
# Baselines are committed per platform. CI runs Linux, so the files are named
# `*-linux.png`. A screenshot taken on macOS is written as `*-darwin.png` and
# CI never reads it, so you cannot refresh a baseline by running the suite
# natively on a Mac. It has to be rendered on Linux.
#
# Two ways, below. Use `container` if you are on Linux/amd64. Use `from-ci`
# anywhere else, and especially on Apple Silicon.
#
set -euo pipefail

MODE="${1:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage:
  ./refresh-baselines.sh container [<playwright args>]
  ./refresh-baselines.sh from-ci <run-id> [<artifact-name>]

container
  Builds the same image CI builds and runs the suite against your local stack
  with --update-snapshots, writing new *-linux.png files into tests/.

  Honest warning: on Apple Silicon this runs amd64 Chromium under emulation.
  Measured here, a test that takes 24 s natively had not finished after ten
  minutes. Treat the container mode as Linux-only in practice.

from-ci
  Takes the screenshots CI actually rendered. When an assertion fails,
  Playwright writes `<name>-actual.png` next to the diff, and the workflow
  uploads tests/e2e/test-results as `error-context-attempt-<n>`. This mode
  downloads that artifact and installs each `-actual.png` over the matching
  committed baseline.

  This is the faithful option: the pixels come from the machine that will
  judge them. Find the run id under the pull request's failing
  test_demosetup_dev job.

Examples:
  ./refresh-baselines.sh container tests/01-example.spec.ts
  ./refresh-baselines.sh from-ci 34921345321
EOF
}

# The stack answers TLS only for SNI `localhost`, so the container cannot just
# dial the caddy container by name - it gets a TLS internal error. Forward
# localhost:41100 inside the container to caddy instead, which makes Chromium
# send the SNI the certificate expects.
run_container() {
  local net
  net="$(docker inspect d2e-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null || true)"
  if [ -z "$net" ]; then
    echo "d2e-caddy is not running. Start the local stack first." >&2
    exit 1
  fi

  docker build --platform linux/amd64 -t d2e-e2e-refresh "$HERE"

  docker run --rm --platform linux/amd64 --network "$net" \
    -v "$HERE/tests:/work/tests" \
    -e D2E_BASE_URL=https://localhost:41100 \
    --entrypoint bash d2e-e2e-refresh -c "
      apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq socat >/dev/null 2>&1
      socat TCP-LISTEN:41100,fork,reuseaddr,bind=127.0.0.1 TCP:d2e-caddy:443 &
      sleep 3
      npx playwright test --update-snapshots $*
    "

  echo
  echo "Review every changed PNG before committing. --update-snapshots rewrites"
  echo "a baseline whether the change was intended or a regression."
}

install_from_ci() {
  local run_id="$1"
  local artifact="${2:-}"
  # Not `local`: the EXIT trap fires after this function returns, and under
  # `set -u` a local would already be out of scope there.
  TMPDIR_DL="$(mktemp -d)"
  trap 'rm -rf "${TMPDIR_DL:-}"' EXIT
  local tmp="$TMPDIR_DL"

  if [ -n "$artifact" ]; then
    gh run download "$run_id" -R OHDSI/Data2Evidence -n "$artifact" -D "$tmp"
  else
    gh run download "$run_id" -R OHDSI/Data2Evidence -p 'error-context-attempt-*' -D "$tmp"
  fi

  local found=0 done_list=""
  # Sorted, so when CI retried and uploaded several attempts the lowest-numbered
  # one wins and the result does not depend on directory order. Retries differ
  # only by antialiasing noise - measured at 3 pixels, max channel delta 1, well
  # inside Playwright's threshold - so any attempt is a valid baseline. Picking
  # deterministically just keeps reruns of this script from churning the file.
  while IFS= read -r actual; do
    # test-results/<spec-dir>/<name>-actual.png  ->  the committed baseline is
    # <name>-linux.png inside the spec's -snapshots directory.
    local base target
    base="$(basename "$actual" -actual.png)"
    target="$(find "$HERE/tests" -name "${base}-linux.png" -print -quit)"
    if [ -z "$target" ]; then
      echo "  ? no baseline named ${base}-linux.png - skipped ($actual)"
      continue
    fi
    case "$done_list" in
      *"|$target|"*) continue ;;
    esac
    done_list="$done_list|$target|"
    cp "$actual" "$target"
    echo "  updated ${target#"$HERE"/}"
    found=$((found + 1))
  done < <(find "$tmp" -name '*-actual.png' | sort)

  if [ "$found" -eq 0 ]; then
    echo "No *-actual.png in that run's artifacts."
    echo "Either no screenshot assertion failed, or the job stopped before reaching one."
    echo "maxFailures is 1 in CI, so an earlier failure hides every later screenshot."
    exit 1
  fi
  echo
  echo "$found baseline(s) updated. Open each diff and confirm the change is the"
  echo "one you intended before committing."
}

case "$MODE" in
  container) shift; run_container "$@" ;;
  from-ci)
    [ $# -ge 2 ] || { usage; exit 1; }
    install_from_ci "$2" "${3:-}"
    ;;
  *) usage; [ -z "$MODE" ] && exit 1 || exit 0 ;;
esac
