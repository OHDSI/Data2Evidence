import json
import logging
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from typing import Optional

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class DataSource(_AuthApi):
    def __init__(self):
        super().__init__()

    # Get list of table from a given schema
    def get_table_names(self, schemaName: str):
        response = self._get("/analytics-svc/api/services/customDBs/{}".format(schemaName), {})
        return json.loads(response.text)

    # Get table data from schema and table name
    def get_table_data(self, schemaName: str, tableName: str):
        response = self._get("/analytics-svc/api/services/customDBs/{}/{}".format(schemaName, tableName), {})
        return json.loads(response.text)
