def py_bool_to_r(value: bool) -> str:
    """
    Convert a Python boolean to an R boolean.
    """
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    return value


def get_trex_env_var(use_trex_connection: bool, is_trex_hana: bool) -> str:
    """
    Determine the trex_connection environment variable value for R.
    """
    if use_trex_connection:
        if is_trex_hana:
            return "trex_hana"
        else:
            return "trex"
    else:
        return "false"


def set_trex_env_var(trex_env_var: str) -> str:
    """
    Set the trex_connection environment variable for R.
    """
    return f"Sys.setenv('trex_connection' = '{trex_env_var}')"
