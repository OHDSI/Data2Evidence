import requests
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI


class PortalUserArtifactAPI:
    """
    API client for Portal User Artifact endpoints.
    Uses service token (client credentials) for authentication instead of user token.
    """
    def __init__(self):
        logger = get_run_logger()
        logger.info("PortalUserArtifactAPI: Initializing with service token...")

        # Get service token via client credentials
        openid_api = OpenIdAPI()
        service_token = openid_api.getClientCredentialToken()
        logger.info("PortalUserArtifactAPI: Service token obtained")

        # Get service route
        service_routes = Variable.get("service_routes")
        if service_routes is None:
            raise ValueError("'service_routes' prefect variable is undefined")
        self.url = service_routes.get("portalServer") + "/"
        self.user_artifact_url = f"{self.url}user-artifact"

        # SSL verification
        python_verify_ssl = Variable.get("python_verify_ssl")
        self.tls_internal_ca_cert = Secret.load("tls-internal-ca-cert")
        self._verify = False if python_verify_ssl == 'false' else self.tls_internal_ca_cert.get()

        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {service_token}"
        }
        logger.info("PortalUserArtifactAPI: Initialized successfully")

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
            verify=self._verify,
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
