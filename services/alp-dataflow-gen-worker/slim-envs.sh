#!/usr/bin/env bash
# Image-build-only post-processing for provisioned pixi environments.
#
# Modes:
#   --strip <plugin-dir>...  drop build-only content from every pixi env under
#                            each plugin dir (toolchain, headers, static
#                            archives, JDK sources, bytecode caches)
#   --dedupe <root>...       collapse byte-identical files in the pixi envs
#                            under each root into hardlinks
#
# Both must run in the SAME RUN as the provisioning they follow. A later layer
# cannot shrink an earlier one, and overlayfs copies a file up before linking
# it, so hardlinking across layers costs more than it saves — --dedupe is only
# free for files created in the layer it runs in.
set -euo pipefail

log() { echo "slim-envs: $*" >&2; }

# The C/C++/Fortran toolchain that conda-forge's `compilers` metapackage brings
# in is a provisioning dependency: renv compiles HADES packages from source and
# uv builds nmslib from git. Nothing compiles once the env is provisioned, and
# an artifact-delivered plugin gets its own env (and its own compilers, if its
# lockfile declares them), so the baked copies are dead weight — 688MB per env
# across four envs, of which 208MB is a glibc locale-archive template.
strip_env() { # $1 = .pixi/envs/<name>
  local env="$1"

  rm -rf "$env/x86_64-conda-linux-gnu" "$env/libexec/gcc" "$env/lib/gcc"
  ( cd "$env/bin" 2>/dev/null && rm -f x86_64-conda-linux-gnu-* \
      cc gcc g++ c++ cpp gfortran f77 f95 gcc-ar gcc-nm gcc-ranlib lto-dump ) || true

  # Headers and static archives: link-time inputs only. The shared objects the
  # envs actually load stay untouched.
  rm -rf "$env/include"
  find "$env" -name '*.a' -type f -delete

  # JDK sources ship beside the runtime image and are never read by a JVM.
  rm -f "$env/lib/jvm/lib/src.zip"

  rm -rf "$env/share/man" "$env/share/doc" "$env/share/info"

  # Regenerated on demand by the interpreter that needs them.
  find "$env" -name __pycache__ -type d -prune -exec rm -rf {} +
}

strip_dirs() {
  local dir env before after
  for dir in "$@"; do
    [ -d "$dir/.pixi/envs" ] || { log "no pixi envs in $dir — skipping"; continue; }
    before="$(du -sm "$dir" | cut -f1)"
    for env in "$dir"/.pixi/envs/*; do
      [ -d "$env" ] && strip_env "$env"
    done
    after="$(du -sm "$dir" | cut -f1)"
    log "stripped $dir: ${before}MB -> ${after}MB"
  done
}

# Envs provisioned in one layer duplicate their common stack byte for byte —
# pixi hardlinks packages out of its cache only within a single build stage, so
# every env carries its own python, arrow, duckdb and JDK.
dedupe() { # $1... = roots to search for pixi envs
  python3 - "$@" <<'PYEOF'
import hashlib, os, stat, sys

# Only .pixi/envs payloads. A plugin's own sources are staged into every plugin
# that shares them (_shared_flow_utils), and linking those would couple plugin
# directories that the rest of the system treats as independently mutable —
# run-flow.sh's dev overlay rewrites one plugin's sources in place. They are
# ~150KB against gigabytes of env payload, so skipping them costs nothing.
env_roots = []
for base in sys.argv[1:]:
    for dirpath, dirnames, _ in os.walk(base):
        if os.path.basename(dirpath) == "envs" \
                and os.path.basename(os.path.dirname(dirpath)) == ".pixi":
            env_roots.extend(os.path.join(dirpath, d) for d in dirnames)
            dirnames[:] = []


def digest(path):
    h = hashlib.blake2b(digest_size=16)
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.digest()


# Symlinks carry no data, and a file smaller than a block saves nothing.
# Group on the metadata a hardlink would have to share, not just the size: two
# copies of one package file can differ in mode between envs.
by_key = {}
for root in env_roots:
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            path = os.path.join(dirpath, name)
            try:
                st = os.lstat(path)
            except OSError:
                continue
            if not stat.S_ISREG(st.st_mode) or st.st_size < 4096:
                continue
            key = (st.st_size, st.st_mode, st.st_uid, st.st_gid)
            by_key.setdefault(key, []).append((path, st))

saved = links = 0
for (size, _mode, _uid, _gid), entries in by_key.items():
    if len(entries) < 2:
        continue
    by_hash = {}
    for path, st in entries:
        try:
            by_hash.setdefault(digest(path), []).append((path, st))
        except OSError:
            continue
    for group in by_hash.values():
        canon, canon_st = group[0]
        for path, st in group[1:]:
            if (st.st_ino, st.st_dev) == (canon_st.st_ino, canon_st.st_dev):
                continue
            tmp = path + ".dedupe-tmp"
            try:
                os.link(canon, tmp)
                os.replace(tmp, path)
            except OSError:
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
                continue
            saved += size
            links += 1

print(f"slim-envs: deduped {links} files, {saved / 2**30:.2f} GiB", file=sys.stderr)
PYEOF
}

case "${1:-}" in
  --strip)  shift; strip_dirs "$@" ;;
  --dedupe) shift; dedupe "$@" ;;
  *) echo "usage: slim-envs.sh --strip <plugin-dir>... | --dedupe <root>..." >&2; exit 2 ;;
esac
