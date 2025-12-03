import requests

from _shared_flow_utils.api.BaseAPI import BaseAPI


class PortalUserArtifactAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        # get_service_route() returns URL with trailing slash
        self.url = self.get_service_route("portalServer")
        # Concatenate without leading slash to avoid double slashes
        self.user_artifact_url = f"{self.url}system-portal/user-artifact"
        self.headers = self.get_options()

    def patch_artifact(self, service_name: str, artifact_id: str | int, data: dict) -> dict:
        """
        Patch (partially update) a user artifact.

        Args:
            service_name: The service name (e.g., 'concept_sets', 'bookmarks')
            artifact_id: The artifact ID (string or integer)
            data: Dictionary containing fields to update (e.g., {"shared": true})

        Returns:
            Updated artifact object as dictionary

        Raises:
            Exception: If the request fails (4xx or 5xx status code)
        """
        url = f"{self.user_artifact_url}/{service_name}/{artifact_id}"
        result = requests.patch(
            url,
            headers=self.headers,
            verify=self.get_verify_value(),
            json=data
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] PortalUserArtifactAPI - Failed to patch artifact '{service_name}/{artifact_id}': {result.text}")
        else:
            return result.json()

    def share_artifact(self, service_name: str, artifact_id: str | int, shared: bool = True) -> dict:
        """
        Convenience method to share or unshare an artifact.

        Args:
            service_name: The service name (e.g., 'concept_sets', 'bookmarks')
            artifact_id: The artifact ID (string or integer)
            shared: True to share, False to unshare (default: True)

        Returns:
            Updated artifact object as dictionary
        """
        return self.patch_artifact(service_name, artifact_id, {"shared": shared})
