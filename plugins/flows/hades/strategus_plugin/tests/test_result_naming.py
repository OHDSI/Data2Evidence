from flows.hades.strategus_plugin.result_naming import resolve_result_name


def test_uses_analysis_results_name_trimmed():
    options = {"analysisResultsName": "  My run ", "notebookName": "nb"}
    assert resolve_result_name(options, "study1", "db1") == "My run"


def test_blank_analysis_results_name_falls_back_to_notebook_name():
    options = {"analysisResultsName": "   ", "notebookName": "nb"}
    assert resolve_result_name(options, "study1", "db1") == "nb"


def test_non_string_analysis_results_name_is_ignored():
    assert resolve_result_name({"analysisResultsName": 42}, "study1", "db1") == "study1 [db1]"


def test_falls_back_to_token_study_code_and_database_code():
    assert resolve_result_name({}, "study1", "db1") == "study1 [db1]"


def test_falls_back_to_database_code_without_token_study_code():
    assert resolve_result_name({}, "", "db1") == "db1"
    assert resolve_result_name({}, None, "db1") == "db1"
