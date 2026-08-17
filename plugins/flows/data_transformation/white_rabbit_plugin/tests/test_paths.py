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
