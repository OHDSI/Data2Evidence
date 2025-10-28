from rpy2 import robjects

def set_trex_env_var(use_trex_connection: bool) -> str:
    """
    Set the trex_connection environment variable for R.
    """
    return (
        "Sys.setenv('trex_connection' = 'true')"
        if use_trex_connection
        else "Sys.setenv('trex_connection' = 'false')"
    )


def convert_to_int_vector(str_list: list[str] | str) -> robjects.IntVector:
    """
    Convert a list of strings or list string to an R IntVector. If the list is empty, return an empty IntVector.
    Handles comma-separated values within individual strings.
    """
    if not str_list:
        return robjects.IntVector([])
    
    # Convert single string to list for uniform processing
    if isinstance(str_list, str):
        str_list = [str_list]
    
    int_list = []
    for item in str_list:
        for sub_item in item.split(','):
            sub_item = sub_item.strip()
            if sub_item:
                int_list.append(int(sub_item))
    
    return robjects.IntVector(int_list)