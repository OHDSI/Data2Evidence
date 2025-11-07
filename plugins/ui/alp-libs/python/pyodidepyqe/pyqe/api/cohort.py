import json
import logging
import os
from pyqe.api.base import _AuthApi
from pyqe.shared import decorator
from pyqe.shared.b64encode_query import _EncodeQueryStringMixin
from pyqe.setup import setup_simple_console_log

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Cohort(_EncodeQueryStringMixin, _AuthApi):
    """Cohort class that allows:
        - retrieve list of cohorts
        - create cohort
        - delete cohort
    Args:
        study_id: String value defining the study id
    """

    def __init__(self, study_id: str = None):
        super().__init__()
        if not study_id:
            if os.environ['PYQE_STUDY_ENTITY_VALUE']:
                self.study_id = os.environ['PYQE_STUDY_ENTITY_VALUE']
            else:
                raise ValueError('Please specify a study id\n')
        else:
            self.study_id = study_id

    async def get_all_cohorts(self, limit: int = 0, offset: int = 0) -> dict:
        params = {
            "datasetId": self.study_id,
            "offset": str(offset),
            "limit": str(limit)
        }
        response = await self._get('/analytics-svc/api/services/cohort', params)
        return await response.json()

    async def delete_cohort(self, cohort_id: int) -> bool:
        response = await self._delete(
            f'/analytics-svc/api/services/cohort?cohortId={cohort_id}&datasetId={self.study_id}')
        return response.string()

    async def create_cohort(self, cohort_definition: dict) -> str:

        if os.getenv('KERNAL') == 'JUPYTER':
            cohort_definition['mriquery'] = str(
                self._encode_query_string(cohort_definition['mriquery']), 'utf-8')
        else:
            cohort_definition['mriquery'] = str(self._encode_query_string(
                cohort_definition['mriquery']).decode('ascii'))

        cohort_definition['datasetId'] = self.study_id
        cohort_definition['syntax'] = json.dumps(cohort_definition['syntax'])

        response = await self._post('/analytics-svc/api/services/cohort', json=cohort_definition)
        return response.string()
