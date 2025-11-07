import json
import logging
import os
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from typing import Optional

logger = logging.getLogger(__name__)
setup_simple_console_log()

@decorator.attach_class_decorator(decorator.log_function, __name__)
class Study(_AuthApi):
    def __init__(self):
        super().__init__()

    async def get_user_study_list(self):
        params = {
            'role': 'researcher'
            }
        response = await self._get('/system-portal/dataset/list', params)
        if response.ok:
            return await response.json()
        