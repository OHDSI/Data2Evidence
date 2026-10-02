def resolve_result_name(options: dict, token_study_code: str | None, database_code: str) -> str:
    """Name the kernel-path flow run uploads its results under.

    Priority: the caller-supplied ``analysisResultsName`` (rD2E
    ``create_options(analysis_results_name = ...)``), then ``notebookName``,
    then ``"{token_study_code} [{database_code}]"``, then ``database_code``.
    """
    explicit = options.get('analysisResultsName')
    if isinstance(explicit, str) and explicit.strip():
        return explicit.strip()
    if options.get('notebookName'):
        return options['notebookName']
    if token_study_code:
        return f"{token_study_code} [{database_code}]"
    return database_code
