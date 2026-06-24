import requests
import os

from _shared_flow_utils.api.BaseAPI import BaseAPI


class PortalServerAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("portalServer")
        self.datasets_url = self.url + 'dataset/list/systemadmin'
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

    def pa_cdm_config_session_vars(self, dataset_id: str) -> dict:
        """
        Resolve the dataset's PA and CDM config id/version as session variables
        """
        if not dataset_id:
            raise Exception(
                f"No cacheId/datasetId available; skipping PA/CDM config session variables")
        try:
            url = f"{self.url}dataset/pa-config/backend?datasetId={dataset_id}"
            result = requests.get(
                url,
                headers=self.headers,
                verify=self.get_verify_value()
            )
            if ((result.status_code >= 400) and (result.status_code < 600)):
                raise Exception(
                    f"[{result.status_code}] PortalServerAPI Failed to retrieve backend PA config for dataset '{dataset_id}'")

            meta = result.json().get("meta", {})
            dependent_config = meta.get("dependentConfig") or {}

            candidates = {
                "sessionVariable:PA_CONFIG_ID": meta.get("configId"),
                "sessionVariable:PA_CONFIG_VERSION": meta.get("configVersion"),
                "sessionVariable:CDM_CONFIG_ID": dependent_config.get("configId"),
                "sessionVariable:CDM_CONFIG_VERSION": dependent_config.get("configVersion"),
            }
            return {k: str(v) for k, v in candidates.items() if v}
        except Exception as e:
            raise Exception(
                f"Failed to resolve PA/CDM config for dataset '{dataset_id}': {e}")

    def update_dataset_attributes_table(self, study_id: str, attribute_id: str, attribute_value: str | None):
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

    def upload_dataset_file(self, datasetId: str, file_path: str, content_type: str = 'application/zip', file_name: str = None) -> dict:
        """
        Upload a file to a dataset.

        Args:
            datasetId: The dataset ID to upload to
            file_path: Path to the file to upload
            content_type: Content type of the file (defaults to 'application/zip')
        Returns:
            dict: Response from the server
        """
        request_url = f"{self.url}dataset/resource?datasetId={datasetId}"
        headers = self.headers.copy()
        headers.pop("Content-Type", None)

        # Validate file exists
        if not os.path.isfile(file_path):
            raise ValueError(f"File not found: {file_path}")

        filename = file_name if file_name is not None else os.path.basename(
            file_path)

        try:
            # Keep file open during the entire request
            with open(file_path, "rb") as file:
                files = {"file": (filename, file, content_type)}

                response = requests.post(
                    request_url,
                    headers=headers,
                    files=files,
                    verify=self.get_verify_value(),
                )

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed for file {file_path}: {e}")
        except Exception as e:
            raise Exception(f"Failed to upload file {file_path}: {e}")

    def upload_graphs_folder(
        self,
        folder_path: str,
        base_path: str,
        parallel: bool = True,
        concurrency_limit: int = 5
    ) -> dict:
        """
        Upload an entire folder to Supabase storage (portal-datasets-graphs bucket).

        Args:
            folder_path: Local path to the folder to upload
            base_path: Base path in storage (e.g., "dashboard_{dataset_id}_{config_type}_{name}_{language}")
            parallel: Whether to upload files in parallel (default: True)
            concurrency_limit: Max concurrent uploads when parallel=True (default: 5)
        Returns:
            dict: Response from the server with uploaded file paths
        """
        request_url = (
            f"{self.url}supabase-storage/upload/folder"
            f"?basePath={base_path}&parallel={str(parallel).lower()}&concurrencyLimit={concurrency_limit}"
        )

        headers = self.headers.copy()
        headers.pop("Content-Type", None)

        if not os.path.isdir(folder_path):
            raise ValueError(f"Folder not found: {folder_path}")

        files_to_upload = []
        for root, _, files in os.walk(folder_path):
            for file_name in files:
                file_full_path = os.path.join(root, file_name)
                relative_path = os.path.relpath(file_full_path, folder_path)
                files_to_upload.append((relative_path, file_full_path))

        if not files_to_upload:
            raise ValueError(f"No files found in folder: {folder_path}")

        file_handles = []
        try:
            multipart_files = []

            for relative_path, file_full_path in files_to_upload:
                fh = open(file_full_path, "rb")
                file_handles.append(fh)
                multipart_files.append(
                    (relative_path, (relative_path, fh, "application/octet-stream")))

            response = requests.post(
                request_url,
                headers=headers,
                files=multipart_files,
                verify=self.get_verify_value(),
            )

            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed for folder {folder_path}: {e}")
        except Exception as e:
            raise Exception(f"Failed to upload folder {folder_path}: {e}")
        finally:
            for fh in file_handles:
                fh.close()
