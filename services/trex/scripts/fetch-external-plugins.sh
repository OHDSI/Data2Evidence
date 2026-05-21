#!/usr/bin/env sh
# Fetch each pinned external plugin tarball and extract it to /usr/src/bundled-plugins/<short-name>/.
# Run inside the trex image build with PLUGINS_REGISTRY set.
set -eu

MANIFEST="${1:-/scripts/external-plugins.txt}"
DEST="${2:-/usr/src/bundled-plugins}"

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
  tar -xzf "$TGZ" -C "$DEST/$SHORT" --strip-components=1
  rm -f "$TGZ"
done < "$MANIFEST"
