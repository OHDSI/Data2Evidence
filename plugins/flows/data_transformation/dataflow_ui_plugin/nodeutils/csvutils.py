import pandas as pd
from _shared_flow_utils.api.SupabaseStorageAPI import SupabaseStorageAPI


def resolve_delimiter(delimiter: str) -> str:
    match delimiter.strip():
        case "/t" | "\\t" | r"\t":
            return "\t"
        case ",":
            return ","
        case _:
            raise ValueError(f"Unsupported delimiter: {delimiter}")


def convert_csv_to_dataframe(filepath: str, 
                             hasheader: bool, 
                             delimiter: str,
                             names: list[str] = None, 
                             encoding: str = "utf-8") -> pd.DataFrame:
    resolved_delimiter = resolve_delimiter(delimiter)
    read_csv_kwargs = {
        "delimiter": resolved_delimiter,
        "encoding": encoding,
    }
    if not hasheader:
        read_csv_kwargs["header"] = None
        read_csv_kwargs["names"] = names

    try:
        return pd.read_csv(filepath, **read_csv_kwargs)
    except pd.errors.ParserError as exc:
        read_csv_kwargs["engine"] = "python"
        # read_csv_kwargs["on_bad_lines"] = "skip"
        return pd.read_csv(filepath, **read_csv_kwargs)


def load_csv_from_storage(
    node_id: str,
    filename: str,
    hasheader: bool = True,
    delimiter: str = ",",
    names: list[str] = None,
    encoding: str = "utf8"
) -> pd.DataFrame:
    """
    Shared helper function to load a CSV file from Supabase storage.
    
    Args:
        node_id: The node ID used to locate the file in storage
        filename: The name of the CSV file to load
        hasheader: Whether the CSV file has a header row
        delimiter: The delimiter used in the CSV file
        names: Optional list of column names to use
        encoding: The file encoding
        
    Returns:
        pd.DataFrame: The loaded data as a pandas DataFrame
    """
    supabase_api = SupabaseStorageAPI()
    downloads_dir = "/app/downloads"
    
    csv_file_path = supabase_api.download_file_to_path(node_id, filename, downloads_dir)
    
    return convert_csv_to_dataframe(
        csv_file_path,
        hasheader=hasheader,
        delimiter=delimiter,
        names=names,
        encoding=encoding
    )