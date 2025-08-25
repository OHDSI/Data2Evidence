def py_bool_to_r(value: bool) -> str:
    """
    Convert a Python boolean to an R boolean.
    """
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    return value


def set_trex_env_var(use_trex_connection: bool) -> str:
    """
    Set the trex_connection environment variable for R.
    """
    return (
        "Sys.setenv('trex_connection' = 'true')"
        if use_trex_connection
        else "Sys.setenv('trex_connection' = 'false')"
    )
