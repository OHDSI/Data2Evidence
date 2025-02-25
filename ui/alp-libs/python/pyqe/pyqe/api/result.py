import logging
import pandas as pd
import os
from pyqe.api.base import _AuthApi
from pyqe.setup import setup_simple_console_log
from pyqe.shared import decorator
from pyqe.shared.b64encode_query import _EncodeQueryStringMixin
logger = logging.getLogger(__name__)
setup_simple_console_log()
import json

@decorator.attach_class_decorator(decorator.log_function, __name__)
class Result(_EncodeQueryStringMixin, _AuthApi):
    """Client to execute request in query engine"""

    def __init__(self):
        super().__init__()

    def get_patient_count(self, filter: dict) -> int:
        """Get patient count which fit the filter request provided

        Args:
            filter: request generated using :py:class:`Query <pyqe.api.query.Query>`
        """
        params = {
            'mriquery': self._encode_query_string(filter)
        }

        response = self._get('/analytics-svc/api/services/population/json/patientcount', params)
        patient_count = response.json()['data'][0]['patient.attributes.pcount']
        logger.debug(
            f'Total number of patients based on the filter: {patient_count}')
        return patient_count

    def get_patient_count_by_cohortId(self, cohort: dict, cohortid: int = None) -> int:
        """Get patient count which fit the filter request provided

        Args:
            filter: request generated using :py:class:`Query <pyqe.api.query.Query>`
        """
        raw_response = self.download_raw(cohort, cohortId=cohortid, getOnlyPatientCount=True)
        if raw_response.ok:
            patient_count = json.loads(raw_response.text)['rowCount']
            
        logger.debug(
            f'Total number of patients based on the filter: {patient_count}')
        return patient_count

    def get_patient(self, cohort: dict) -> dict:
        params = {
            'mriquery': self._encode_query_string(cohort)
        }
        response = self._get('/analytics-svc/api/services/patient', params)
        return response.json()

    def download_stream(self, cohort: dict):
        """Download stream from MRI which fit the cohort request provided

        Args:
            cohort: request generated using :py:class:`Query <pyqe.api.query.Query>`
        """

        params = {
            'mriquery': self._encode_query_string(cohort)
        }

        return self._get_stream('/analytics-svc/api/services/datastream/patient', params)

    def download_dataframe(self, cohort: dict, filename: str = "__temp.csv", cohortid: int = None, limit: int or bool = False, offset: int = 0):
        """Download dataframe from MRI which fit the cohort request provided

        Args:
            cohort: request generated using :py:class:`Query <pyqe.api.query.Query>`
            limit: integer
            offset: integer
        """

        if limit < 0:
            raise ValueError(f'limit value: {limit} cannot be negative')

        if offset < 0:
            raise ValueError(f'offset value: {offset} cannot be negative')

        cohort['cohortDefinition']['limit'] = limit
        cohort['cohortDefinition']['offset'] = offset

        try:

            if os.path.exists(filename):
                os.remove(filename)
                
            if filename.endswith(".parquet"):
                raw_response = self.download_raw(cohort, "PARQUET", cohortid)
                content = raw_response.content

                if not content:
                    return pd.DataFrame(columns=[])

                with open(filename, "wb") as file:  # write binary data
                    file.write(content)

                del content

                response = pd.read_parquet(filename)

                return response
            else:
                raw_response = self.download_raw(cohort, "CSV", cohortid)
                text = raw_response.content  # Get it as bytes

                if not text:
                    return pd.DataFrame(columns=[])

                with open(filename, "ab") as file:  # Use file to refer to the file object
                    file.write(text)

                del text

                tfr = pd.read_csv(filename, chunksize=1000, iterator=True, engine='python')

                response = pd.concat(tfr, ignore_index=True)

                return response
        except BaseException as error:
            raise error
        finally:
            if os.path.exists(filename):
                os.remove(filename)

    def download_patient_dataframe(self, entity_cohort: dict, cohortid: int = None):
        """Download patient dataframe joined with related entities from MRI which fit the cohort request provided

        Args:
            entity_cohort: <k,v> where key is entity name and value is request generated using :py:class:`Query <pyqe.api.query.Query>`
        """

        patient_df = self.download_dataframe(
            entity_cohort["Patient"], "patient.csv", cohortid)

        result = None
        for entity_name in entity_cohort.keys():
            if entity_name != "Patient":
                result = patient_df.join(self.download_dataframe(
                    entity_cohort[entity_name], f"{entity_name}.csv", cohortid),
                    lsuffix="_patient",
                    rsuffix=f"_{entity_name}",
                    how="left",
                    on="pid")

        if result is None:
            return patient_df

        return result

    def download_all_entities_dataframe(self, entity_cohort: dict, cohortId: int = None):
        """Download all entities into dataframes

        Args:
            entity_cohort: <k,v> where key is entity name and value is request generated using :py:class:`Query <pyqe.api.query.Query>`
        """

        result = {}
        for entity_name in entity_cohort.keys():
            result[entity_name] = self.download_dataframe(
                entity_cohort[entity_name], f"{entity_name}.csv", cohortId)

        return result

    def download_raw(self, cohort: dict, dataFormat: str = "CSV", cohortId: int = None, getOnlyPatientCount: bool = False):
        """Download raw response from MRI which fit the cohort request provided

        Args:
            cohort: request generated using :py:class:`Query <pyqe.api.query.Query>`
        """
        if dataFormat.upper() == "PARQUET":
            params = {
                'mriquery': self._encode_query_string(cohort),
                'dataFormat': "PARQUET",
                'cohortId': cohortId,
                'returnOnlyPatientCount': getOnlyPatientCount
            }
        else:
            params = {
                'mriquery': self._encode_query_string(cohort),
                'cohortId': cohortId,
                'returnOnlyPatientCount': getOnlyPatientCount
            }

        return self._get_stream('/analytics-svc/api/services/datastream/patient', params)

    def get_recontact_info(self, cohort: dict, filename: str):
        """Download encrypted data from MRI which fit the cohort request provided

        Args:
            cohort: request generated using :py:class:`Query <pyqe.api.query.Query>`
            filename: name of the file to be created
        """
        params = {
            'mriquery': self._encode_query_string(cohort)
        }

        response = self._get('/analytics-svc/api/services/recontact/patient', params)
        g = open(f"{filename}.enc", "wb")
        g.write(bytes.fromhex(response.text))
        g.close()

        return f"{filename}.enc created"
