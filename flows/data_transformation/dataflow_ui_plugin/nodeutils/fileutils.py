import json
import zipfile
from io import BytesIO
from pathlib import Path
from typing import List


def process_zip(raw_data: bytes, output_folder: Path) -> List[str]:
    """Extract ZIP file into output folder"""
    with zipfile.ZipFile(BytesIO(raw_data)) as z:
        z.extractall(output_folder)


def process_ndjson(raw_data: bytes, output_folder: Path, file_name: str, encoding: str) -> List[str]:
    """
    Slice NDJSON file into individual JSON files
    and save them to output folder
    """
    lines = raw_data.decode(encoding).splitlines()
    for i, line in enumerate(lines):
        data = json.loads(line)
        save_path = output_folder / f"{Path(file_name).stem}_{i+1}.json"
        with open(save_path, "w", encoding=encoding) as f:
            json.dump(data, f)
