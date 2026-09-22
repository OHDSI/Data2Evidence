# create_cachedb_file_plugin tests_prefect

Tests for modules that genuinely need prefect's real client/schema classes to
be worth anything — currently just `concurrency_reconciliation.py`, tested
against a mocked `SyncPrefectClient`.

Kept out of `../tests/` on purpose: that suite is "safe to run anywhere,"
including a venv with no prefect installed at all, and two of its tests assert
`"prefect" not in sys.modules` after importing the pure planner modules to
guarantee that. Importing prefect here, in the same pytest session as those,
would poison `sys.modules` and fail them even though nothing under test here
actually violates that discipline — so this is a separate pytest invocation,
not a subdirectory `../tests/` would ever be pointed at together with itself.

## Running

Prefect is already this package's own pyproject dependency, so its own venv
has everything needed:

```sh
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." pytest create_cachedb_file_plugin/tests_prefect/ -v
```
