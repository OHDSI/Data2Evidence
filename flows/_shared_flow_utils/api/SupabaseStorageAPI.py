import requests

from prefect.variables import Variable
from prefect.blocks.system import Secret

from _shared_flow_utils.api.BaseAPI import BaseAPI

class SupabaseStorageAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("supabaseStorage")
        self.headers = self.get_options()

    
    def get_options(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {Secret.load("supabase-storage-jwt-token").get()}"}

    
    def get_csv_file(self, node_id: str, filename: str) -> str:
        csv_node_bucket = Variable.get("data_transformation_bucket")

        # Todo: Filename to be flow or revision id + csv file name
        request_url = f"{self.url}object/{csv_node_bucket}/data-transformation/{node_id}/{filename}"
        response = requests.get(request_url, headers=self.get_options())

        # raise error if status code is >400
        response.raise_for_status()
        return response.text