import pandas as pd


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