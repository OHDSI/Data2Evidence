import pandas as pd
from io import StringIO



def resolve_delimiter(delimiter: str) -> str:
    match delimiter.strip():
        case "/t" | "\\t" | r"\t":
            return "\t"
        case ",":
            return ","
        case _:
            raise ValueError(f"Unsupported delimiter: {delimiter}")


def convert_csv_to_dataframe(csv_response: str, 
                             hasheader: bool, 
                             delimiter: str,
                             names: list[str] = None, 
                             encoding: str = "utf-8") -> pd.DataFrame:
    if hasheader:
        df = pd.read_csv(StringIO(csv_response), 
                            delimiter=resolve_delimiter(delimiter), 
                            encoding=encoding)
    else:
        df = pd.read_csv(StringIO(csv_response), 
                        header=None, 
                        names=names, 
                        delimiter=resolve_delimiter(delimiter), 
                        encoding=encoding)
    return df