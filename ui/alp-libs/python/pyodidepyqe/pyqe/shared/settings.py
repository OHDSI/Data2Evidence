import pkgutil
import yaml
from typing import Any


data: Any = pkgutil.get_data('pyqe', 'settings.yaml')
settings: Any = yaml.safe_load(data)


def is_feature(feature_name: str) -> bool:
    global settings
    setting_name = 'feature-flags'
    if settings and setting_name in settings and feature_name in settings[setting_name]:
        return settings[setting_name][feature_name]

    return False
