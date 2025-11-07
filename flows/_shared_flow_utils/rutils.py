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


def convert_to_int_vector(str_list: list[str | int] | str | int) -> robjects.IntVector:
    """
    Convert a list of strings/integers or single string/integer to an R IntVector. 
    If the input is empty, return an empty IntVector.
    """
    if not str_list:
        return robjects.IntVector([])
    
    if isinstance(str_list, (str, int)):
        str_list = [str_list]
    
    int_list = []
    for item in str_list:
        if isinstance(item, int):
            int_list.append(item)
        else:
            for sub_item in str(item).split(','):
                sub_item = sub_item.strip()
                if sub_item:
                    int_list.append(int(sub_item))
    
    return robjects.IntVector(int_list)