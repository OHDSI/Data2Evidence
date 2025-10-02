def set_trex_env_var(use_trex_connection: bool) -> str:
    """
    Set the trex_connection environment variable for R.
    """
    return (
        "Sys.setenv('trex_connection' = 'true')"
        if use_trex_connection
        else "Sys.setenv('trex_connection' = 'false')"
    )