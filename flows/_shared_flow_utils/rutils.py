from rpy2 import robjects

def get_trex_env_var(use_trex_connection: bool, is_trex_hana: bool) -> str:
    """
    Determine the trex_connection environment variable value for R.
    """
    print(f"is_trex_hana: {is_trex_hana}")
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