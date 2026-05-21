#!/usr/bin/env python3
"""
Extract an npm-style plugin tarball, recovering from cross-directory hardlinks
that appear in archive order before their targets.

GNU tar's `-x` aborts (exit 2) when a hardlink entry references a path that has
not been extracted yet. Deno's deduplicated module cache (`node_modules/.deno/`)
creates many such cross-subdirectory hardlinks, and node-tar (used by `npm pack`)
emits them in walk order, which is not always target-first.

This script does two passes over the archive:
  1. Extract every non-hardlink member (regular files, dirs, symlinks).
  2. Walk hardlink members and recreate each as `os.link(target, link)`, now
     that the target file exists on disk.
"""
import os
import sys
import tarfile


def strip(name: str, n: int) -> str | None:
    parts = name.split("/", n)
    return parts[n] if len(parts) > n else None


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "usage: extract-plugin-tarball.py <tarball.tgz> <dest-dir> <strip-components>",
            file=sys.stderr,
        )
        return 2
    tgz, dest, strip_components = sys.argv[1], sys.argv[2], int(sys.argv[3])
    os.makedirs(dest, exist_ok=True)

    extracted = 0
    linked = 0
    missing = 0
    skipped = 0

    with tarfile.open(tgz, "r:gz") as tf:
        members = tf.getmembers()
        for m in members:
            if m.islnk():
                continue
            new_name = strip(m.name, strip_components)
            if not new_name:
                continue
            m.name = new_name
            try:
                tf.extract(m, dest, set_attrs=False)
                extracted += 1
            except Exception as e:
                print(f"warn: extract failed: {new_name}: {e}", file=sys.stderr)
                skipped += 1

        for m in members:
            if not m.islnk():
                continue
            link_name = strip(m.name, strip_components)
            target_name = strip(m.linkname, strip_components)
            if not link_name or not target_name:
                continue
            link_path = os.path.join(dest, link_name)
            target_path = os.path.join(dest, target_name)
            if os.path.lexists(link_path):
                continue
            if not os.path.exists(target_path):
                missing += 1
                continue
            os.makedirs(os.path.dirname(link_path), exist_ok=True)
            try:
                os.link(target_path, link_path)
                linked += 1
            except OSError as e:
                print(f"warn: link failed: {link_path} -> {target_path}: {e}", file=sys.stderr)
                skipped += 1

    print(
        f"extracted={extracted} linked={linked} missing={missing} skipped={skipped}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
