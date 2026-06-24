from _shared_flow_utils.diagnostics import collect_bounded_diagnostics


def collect_dqd_diagnostics(
    output_folder: str,
    output_file: str | None = None,
    max_error_files: int = 10,
    max_log_files: int = 3,
    max_chars_per_file: int = 4000,
) -> dict:
    return collect_bounded_diagnostics(
        output_folder=output_folder,
        include_files=["errorReportR.txt", "errorReportSql.txt", output_file],
        grouped_globs=[
            ("*.error.txt", max_error_files, None),
            ("*.log", max_log_files, None),
        ],
        max_chars_per_file=max_chars_per_file,
    )