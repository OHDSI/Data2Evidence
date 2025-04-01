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
class PAConfig(_AuthApi):
    def __init__(self):
        super().__init__()
        self._default_pa_config: Optional(dict) = None

    def _get_my_config(self, selectedStudyId):
        params = {
            'action': 'getMyConfig',
            'datasetId': selectedStudyId
        }
        response = self._get('/analytics-svc/pa/services/analytics.xsjs', params)
        return json.loads(response.text)
    
    def _get_study_config_list(self, study):
        params = {
            'action': 'getMyStudyConfigList',
            'datasetId': study
        }
        response = self._get('/analytics-svc/pa/services/analytics.xsjs', params)
        return json.loads(response.text)

    def _get_frontend_config(self, config_id, config_version, selectedStudyId, lang = 'eng'):
        params = {
            'action': 'getFrontendConfig',
            'configId': config_id,
            'configVersion': config_version,
            'datasetId': selectedStudyId,
            'lang': lang
        }
        response = self._get('/analytics-svc/pa/services/analytics.xsjs', params)
        return json.loads(response.text)
