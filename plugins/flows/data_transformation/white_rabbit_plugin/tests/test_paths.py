import pytest

from white_rabbit_plugin.paths import (
    ensure_whiterabbit_dirs,
    require_whiterabbit_dist,
    clear_csv_working_dir,
)


def test_ensure_creates_both_directories(tmp_path):
    base = tmp_path / "whiterabbit"
    csv_dir = base / "csvfiles"

    ensure_whiterabbit_dirs(str(base), str(csv_dir))

    assert base.is_dir()
    assert csv_dir.is_dir()


def test_ensure_is_idempotent(tmp_path):
    base = tmp_path / "whiterabbit"
    csv_dir = base / "csvfiles"

    ensure_whiterabbit_dirs(str(base), str(csv_dir))
    ensure_whiterabbit_dirs(str(base), str(csv_dir))

    assert csv_dir.is_dir()


def test_require_dist_raises_runtime_error_when_missing(tmp_path):
    missing_bin = tmp_path / "whiterabbit" / "dist" / "bin"

    with pytest.raises(RuntimeError) as excinfo:
        require_whiterabbit_dist(str(missing_bin))

    # The whole point of this fix: name the dist, not config.ini.
    assert str(missing_bin) in str(excinfo.value)
    assert "config.ini" not in str(excinfo.value)


def test_require_dist_does_not_raise_when_present(tmp_path):
    bin_dir = tmp_path / "whiterabbit" / "dist" / "bin"
    bin_dir.mkdir(parents=True)

    require_whiterabbit_dist(str(bin_dir))


def test_clear_csv_working_dir_removes_only_csv_files(tmp_path):
    csv_dir = tmp_path / "csvfiles"
    csv_dir.mkdir()
    (csv_dir / "stale_one.csv").write_text("a,b\n1,2\n")
    (csv_dir / "stale_two.CSV").write_text("a,b\n3,4\n")
    (csv_dir / "ScanReport.xlsx").write_bytes(b"not a csv")

    removed = clear_csv_working_dir(str(csv_dir))

    assert removed == 2
    assert not (csv_dir / "stale_one.csv").exists()
    assert not (csv_dir / "stale_two.CSV").exists()
    assert (csv_dir / "ScanReport.xlsx").exists()


def test_clear_csv_working_dir_tolerates_missing_dir(tmp_path):
    assert clear_csv_working_dir(str(tmp_path / "nope")) == 0


def test_download_task_clears_stale_csvs_before_downloading(tmp_path, monkeypatch):
    """A scan must not inherit CSVs from a previous scan or another node."""
    # Imported inside the test on purpose: tasks.py pulls in Prefect at module
    # load, and the other tests in this file are deliberately dependency-free.
    from prefect.logging import disable_run_logger

    from white_rabbit_plugin import tasks

    csv_dir = tmp_path / "csvfiles"
    csv_dir.mkdir()
    (csv_dir / "from_a_previous_scan.csv").write_text("a\n1\n")

    monkeypatch.setattr(tasks, "WHITERABBIT_CSV_DIR", str(csv_dir))

    downloaded = []

    class FakeSupabaseAPI:
        def list_files(self, node_id):
            return [{"name": "current.csv", "type": "CSV"}]

        def download_file_to_path(self, node_id, filename, filepath):
            downloaded.append((filename, filepath))
            (csv_dir / filename).write_text("b\n2\n")

    # .fn skips the Prefect task wrapper, so the task's get_run_logger() call has
    # no run context to bind to and raises MissingContextError. disable_run_logger
    # swaps in a null logger for the duration of this one call. Scoped here rather
    # than in a fixture: it is a property of calling *this* task outside a flow,
    # and a module-wide fixture would silently mask the same error in tests that
    # should never touch Prefect at all.
    with disable_run_logger():
        result = tasks.download_files_from_supabase_storage.fn(
            "node-1", FakeSupabaseAPI()
        )

    assert result is True
    assert downloaded == [("current.csv", str(csv_dir))]
    assert (csv_dir / "current.csv").exists()
    assert not (csv_dir / "from_a_previous_scan.csv").exists()
