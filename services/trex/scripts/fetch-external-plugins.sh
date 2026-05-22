#!/usr/bin/env sh
# Fetch each pinned external plugin tarball and extract it to /usr/src/bundled-plugins/<short-name>/.
# Run inside the trex image build with PLUGINS_REGISTRY set.
# Uses extract-plugin-tarball.py to handle cross-directory hardlinks in npm-packed
# tarballs (which GNU tar's -x aborts on) and to guard against path traversal.
set -eu

MANIFEST="${1:-/scripts/external-plugins.txt}"
DEST="${2:-/usr/src/bundled-plugins}"
EXTRACTOR="${3:-/scripts/extract-plugin-tarball.py}"

if [ ! -f "$MANIFEST" ]; then
  echo "external-plugins manifest not found at $MANIFEST"
  exit 1
fi

mkdir -p "$DEST"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

while IFS= read -r LINE || [ -n "$LINE" ]; do
  CLEAN="$(printf '%s' "$LINE" | sed 's/#.*$//' | tr -d '[:space:]')"
  [ -z "$CLEAN" ] && continue
  PKG="$CLEAN"
  SHORT="$(printf '%s' "$PKG" | sed 's|@[^/]*/||' | sed 's|@[^@]*$||')"
  echo "Fetching $PKG -> $DEST/$SHORT"
  (
    cd "$WORK"
    npm pack "$PKG" --silent
  )
  TGZ="$(ls -1t "$WORK"/*.tgz | head -n 1)"
  rm -rf "$DEST/$SHORT"
  mkdir -p "$DEST/$SHORT"
  python3 "$EXTRACTOR" "$TGZ" "$DEST/$SHORT" 1
  rm -f "$TGZ"
done < "$MANIFEST"
