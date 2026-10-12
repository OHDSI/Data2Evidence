"""Per-attempt Achilles output with best-effort seven-day retention."""

from contextlib import contextmanager
from dataclasses import dataclass
import fcntl
from pathlib import Path
from shutil import rmtree
from tempfile import mkdtemp
import time


def prune_failed_output(root, logger):
    cutoff = time.time() - 7 * 24 * 60 * 60
    try:
        attempts = list(Path(root).iterdir())
    except OSError as exc:
        logger.warning(f"Could not enumerate Achilles output {root}: {exc}")
        return
    for attempt in attempts:
        try:
            if attempt.is_symlink() or not attempt.is_dir():
                continue
            marker = attempt / ".failed"
            lease = attempt / ".lock"
            # Legacy failed attempts have no lease. Leave unknown directories alone.
            if not lease.exists():
                if marker.is_file() and marker.stat().st_mtime < cutoff:
                    rmtree(attempt)
                continue
            with lease.open("r+") as lock:
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    continue
                # The worker holds this lock throughout the attempt. Process death
                # releases it automatically, including SIGKILL/OOM termination.
                timestamp = marker.stat().st_mtime if marker.exists() else lease.stat().st_mtime
                if timestamp < cutoff:
                    rmtree(attempt)
        except OSError as exc:
            logger.warning(f"Could not prune Achilles output {attempt}: {exc}")


@dataclass
class OutputAttempt:
    path: str
    retained: bool = False


def retain_output(attempt: OutputAttempt, logger):
    """Retain diagnostics without making an optional step fatal."""
    # Keep the decision even if a full filesystem prevents writing the marker.
    attempt.retained = True
    try:
        (Path(attempt.path) / ".failed").touch()
    except OSError as exc:
        logger.warning(f"Could not mark failed Achilles output {attempt.path}: {exc}")


@contextmanager
def achilles_output(root, flow_run_id, logger):
    Path(root).mkdir(parents=True, exist_ok=True)
    attempt = Path(mkdtemp(prefix=f"{flow_run_id}-", dir=root))
    state = OutputAttempt(str(attempt))
    with (attempt / ".lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield state
        except BaseException:
            retain_output(state, logger)
            raise
        else:
            if state.retained or (attempt / ".failed").exists():
                return
            try:
                rmtree(attempt)
            except OSError as exc:
                logger.warning(f"Could not remove Achilles output {attempt}: {exc}")
                retain_output(state, logger)
