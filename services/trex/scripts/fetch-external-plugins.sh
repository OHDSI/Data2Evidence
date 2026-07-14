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

# Registry pulls (npm pack) intermittently fail on transient GitHub Packages /
# feed hiccups, which would otherwise abort the whole image build. Retry with
# exponential backoff before giving up.
PACK_RETRIES="${PACK_RETRIES:-5}"
PACK_BACKOFF="${PACK_BACKOFF:-3}"
retry() {
  attempt=1
  delay="$PACK_BACKOFF"
  while true; do
    if "$@"; then
      return 0
    fi
    if [ "$attempt" -ge "$PACK_RETRIES" ]; then
      echo "giving up after $PACK_RETRIES attempts: $*" >&2
      return 1
    fi
    echo "attempt $attempt/$PACK_RETRIES failed: $* — retrying in ${delay}s" >&2
    sleep "$delay"
    attempt=$((attempt + 1))
    delay=$((delay * 2))
  done
}

while IFS= read -r LINE || [ -n "$LINE" ]; do
  CLEAN="$(printf '%s' "$LINE" | sed 's/#.*$//' | tr -d '[:space:]')"
  [ -z "$CLEAN" ] && continue
  PKG="$CLEAN"
  (
    cd "$WORK"
    retry npm pack "$PKG" --silent
  )
  TGZ="$(ls -1t "$WORK"/*.tgz | head -n 1)"
  # Derive SHORT from the tarball's own package.json (not the manifest line)
  # so it remains safe even if PKG is a URL, git spec, or other npm-pack input.
  NAME="$(tar -xzOf "$TGZ" package/package.json | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')"
  SHORT="$(printf '%s' "$NAME" | sed 's|^@[^/]*/||')"
  case "$SHORT" in
    ""|*/*|*..*|.|..)
      echo "reject: unsafe plugin short-name '$SHORT' from $PKG" >&2
      rm -f "$TGZ"
      exit 1
      ;;
  esac
  echo "Fetching $PKG -> $DEST/$SHORT"
  rm -rf "$DEST/$SHORT"
  mkdir -p "$DEST/$SHORT"
  python3 "$EXTRACTOR" "$TGZ" "$DEST/$SHORT" 1
  rm -f "$TGZ"
done < "$MANIFEST"
