#!/bin/bash
# Generate deno.lock files for all functions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

generate_lock() {
    local dir="$1"
    local name="$(basename "$dir")"

    # Skip if no deno.json
    if [[ ! -f "$dir/deno.json" ]]; then
        return
    fi

    # Find entrypoint
    local entrypoint=""
    if [[ -f "$dir/index.ts" ]]; then
        entrypoint="index.ts"
    elif [[ -f "$dir/mod.ts" ]]; then
        entrypoint="mod.ts"
    elif [[ -f "$dir/src/index.ts" ]]; then
        entrypoint="src/index.ts"
    else
        echo "  Skipping $name: no entrypoint found"
        return
    fi

    echo "  Generating lock for $name ($entrypoint)"
    (cd "$dir" && deno cache --lock=deno.lock "$entrypoint" 2>&1) || {
        echo "    Warning: Failed to generate lock for $name"
    }
}

echo "Generating deno.lock files for functions..."
for dir in "$ROOT_DIR"/plugins/functions/*/; do
    [[ -d "$dir" ]] && generate_lock "$dir"
done

echo ""
echo "Generating deno.lock files for fhir_functions..."
for dir in "$ROOT_DIR"/plugins/fhir_functions/*/; do
    [[ -d "$dir" ]] && generate_lock "$dir"
done

echo ""
echo "Done!"
