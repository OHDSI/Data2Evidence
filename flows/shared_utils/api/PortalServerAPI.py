import requests

from shared_utils.api.BaseAPI import BaseAPI


class PortalServerAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("portalServer")
        self.datasets_url = self.url + 'dataset/list?role=systemAdmin'
        self.dataset_attributes_url = self.url + 'dataset/attribute'
        self.headers = self.get_options()

    def get_datasets_from_portal(self):
        result = requests.get(
            self.datasets_url,
            headers=self.headers,
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] PortalServerAPI Failed to retrieve datasets from portal")
        else:
            datasets_list = result.json()
            return datasets_list

    def update_dataset_attributes_table(self, study_id: str, attribute_id: str, attribute_value: str):
        result = requests.put(
            self.dataset_attributes_url,
            headers=self.headers,
            verify=self.get_verify_value(),
            json={"studyId": str(
                study_id), "attributeId": attribute_id, "value": attribute_value}
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] PortalServerAPI - Failed to update dataset attribute '{attribute_id}' for study '{study_id}'")
        else:
            return True
