from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parent.parent / "db" / "migrations"


def test_no_semicolon_inside_sql_comments():
    """run_sql_statements splits a script on every ';', comments included, so a semicolon in a
    comment ships a comment-only fragment to the database (HANA: 'invalid SQL type', #1898)."""
    offenders = []
    for path in sorted(MIGRATIONS.rglob("*.sql")):
        for lineno, line in enumerate(path.read_text().splitlines(), start=1):
            _, sep, comment = line.partition("--")
            if sep and ";" in comment:
                offenders.append(f"{path.relative_to(MIGRATIONS)}:{lineno}: {line.strip()}")
    assert offenders == []


def test_every_dialect_has_the_same_migration_scripts():
    dialects = sorted(p for p in MIGRATIONS.iterdir() if p.is_dir())
    assert dialects, "no migration dialect directories found"
    scripts = {d.name: sorted(f.name for f in d.glob("*.sql")) for d in dialects}
    expected = scripts[dialects[0].name]
    assert all(files == expected for files in scripts.values()), scripts
