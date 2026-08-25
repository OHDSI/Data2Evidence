"""Error taxonomy for the cache copy plugin.

This module must never import prefect: the pure planner test suite imports it
from a bare virtualenv.
"""


class CacheCopyError(Exception):
    """Base class for every failure raised by the cache copy plugin."""


class PlannerError(CacheCopyError):
    """Chunk planning could not produce a usable plan."""


class ChunkCopyError(CacheCopyError):
    """A single chunk failed to copy after its retries were exhausted."""


class ReconciliationError(CacheCopyError):
    """Target row count did not match the source after all chunks completed."""


class FreshCopyResetError(CacheCopyError):
    """A freshCopy reset could not be applied cleanly; nothing was copied."""
