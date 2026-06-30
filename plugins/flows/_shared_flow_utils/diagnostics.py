from pathlib import Path
from typing import Callable


def _read_text_snippet(file_path: Path, max_chars: int) -> str:
    try:
        text = file_path.read_text(errors="replace")
    except Exception as e:
        return f"<unable to read {file_path.name}: {e}>"

    if len(text) <= max_chars:
        return text

    return f"{text[:max_chars]}\n... truncated after {max_chars} characters ..."


def collect_bounded_diagnostics(
    output_folder: str,
    include_files: list[str] | None = None,
    grouped_globs: list[tuple[str, int, Callable[[Path], object] | None]] | None = None,
    max_chars_per_file: int = 4000,
) -> dict:
    output_path = Path(output_folder)
    diagnostics = {
        "output_folder": str(output_path),
        "files": {},
        "truncated_file_groups": {},
    }

    if not output_path.exists():
        diagnostics["error"] = f"Output folder does not exist: {output_path}"
        return diagnostics

    for file_name in include_files or []:
        if not file_name:
            continue
        file_path = output_path / file_name
        if file_path.exists():
            diagnostics["files"][file_path.name] = _read_text_snippet(
                file_path, max_chars_per_file
            )

    for pattern, max_files, sort_key in grouped_globs or []:
        files = sorted(output_path.glob(pattern), key=sort_key)
        for file_path in files[:max_files]:
            diagnostics["files"][file_path.name] = _read_text_snippet(
                file_path, max_chars_per_file
            )
        if len(files) > max_files:
            diagnostics["truncated_file_groups"][pattern] = (
                f"{len(files) - max_files} additional file(s) omitted"
            )

    return diagnostics
