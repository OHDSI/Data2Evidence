import pkgutil
import yaml
from typing import Any

data: Any = pkgutil.get_data('pyqe')
settings: Any = yaml.safe_load(data)
