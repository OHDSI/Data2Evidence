"""Per-attempt Achilles output with startup pruning of failed diagnostics."""

from contextlib import contextmanager
from pathlib import Path
from shutil import rmtree
from tempfile import mkdtemp
import time


def prune_failed_output(root, logger):
    cutoff = time.time() - 7 * 24 * 60 * 60
    for attempt in Path(root).iterdir():
        if attempt.is_symlink() or not attempt.is_dir():
            continue
        marker = attempt / ".failed"
        try:
            if marker.is_file() and marker.stat().st_mtime < cutoff:
                rmtree(attempt)
        except OSError as exc:
            logger.warning(f"Could not prune Achilles output {attempt}: {exc}")


@contextmanager
def achilles_output(root, flow_run_id, logger):
    Path(root).mkdir(parents=True, exist_ok=True)
    attempt = Path(mkdtemp(prefix=f"{flow_run_id}-", dir=root))
    try:
        yield str(attempt)
    except BaseException:
        # Only finished attempts are eligible for retention cleanup. Directory
        # age alone is unsafe because another run may still be writing to it.
        try:
            (attempt / ".failed").touch()
        except OSError as exc:
            logger.warning(f"Could not mark failed Achilles output {attempt}: {exc}")
        raise
    else:
        try:
            rmtree(attempt)
        except OSError as exc:
            logger.warning(f"Could not remove Achilles output {attempt}: {exc}")
            # Retry cleanup on a later startup rather than failing a good run.
            try:
                (attempt / ".failed").touch()
            except OSError:
                pass
