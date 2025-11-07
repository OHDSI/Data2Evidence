import json
import logging
import os
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator

logger = logging.getLogger(__name__)
setup_simple_console_log()

@decorator.attach_class_decorator(decorator.log_function, __name__)
class Study(_AuthApi):
    def __init__(self):
        super().__init__()

    def get_user_study_list(self):
        params = {
            'role': 'researcher'
            }
        response = self._get('/system-portal/dataset/list', params)
        return json.loads(response.text)