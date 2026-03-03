import re
import time
import requests
from urllib.parse import urlparse
from prefect.logging import get_run_logger
from _shared_flow_utils.api.BaseAPI import BaseAPI
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI

_FHIR_VERSION_RE = re.compile(r'^(R\d+|DSTU\d+|STU\d+)$')

class FhirAPI(BaseAPI):
    def __init__(self):
        super().__init__()
        self.url = self.get_service_route("fhirGateway")
        self.logger = get_run_logger()
        self.auth = OpenIdAPI()
    def get_headers(self):
        token = self.auth.getClientCredentialToken()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    def post(self, study_token: str, resource_type: str, resource):
        url = f"{self.url}project/{study_token}/{resource_type}"
        result = requests.post(
            url,
            headers=self.get_headers(),
            verify=self.get_verify_value(),
            json=resource
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] FhirAPI - Failed to post FHIR resource")
        else:
            return True

    def get(self, resource_type: str, query: str):
        url = f"{self.url}superadmin/{resource_type}{query}"
        result = requests.get(
            url,
            headers=self.get_headers(),
            verify=self.get_verify_value()
        )
        if ((result.status_code >= 400) and (result.status_code < 600)):
            raise Exception(
                f"[{result.status_code}] FhirAPI - Failed to get FHIR resource")
        else:
            return result.json()

    # ── Bulk export helpers ──────────────────────────────────────────────────

    def _extract_fhir_resource_path(self, medplum_url: str) -> str | None:
        """
        Extract the resource path that comes after the FHIR version segment
        (R4, R5, …) from a full medplum URL.

        The gateway appends this path to its own base ({fhirServer}/fhir/R4),
        so the version segment must NOT be included.

        Examples
        --------
        https://medplum/fhir/R4/bulkdata/export/job-123  →  "bulkdata/export/job-123"
        https://medplum/fhir/R4/Binary/abc               →  "Binary/abc"
        """
        path = urlparse(medplum_url).path          # e.g. /fhir/R4/bulkdata/export/job-123
        segments = path.lstrip("/").split("/")      # ['fhir', 'R4', 'bulkdata', 'export', 'job-123']

        for i, segment in enumerate(segments):
            if _FHIR_VERSION_RE.match(segment) and i + 1 < len(segments):
                return "/".join(segments[i + 1:])

        # If we can't find a FHIR version segment (R4, DSTU2, STU3, etc.) then
        # this is likely not a medplum/fhir resource path (for example, a
        # presigned storage URL). Return None to indicate we should NOT
        # rewrite this URL to a project route.
        self.logger.info(
            f"Could not identify FHIR version segment in URL '{medplum_url}'; "
            f"leaving URL unchanged."
        )
        return None

    def _to_project_url(self, medplum_url: str, study_code: str) -> str:
        """
        Convert a medplum URL to a fhirGateway project-route URL so that
        the request uses the same project credentials as the export trigger.
        """
        resource_path = self._extract_fhir_resource_path(medplum_url)
        # If we couldn't identify a FHIR resource path, don't rewrite — return
        # the original URL (presigned/storage URL or external host).
        if resource_path is None:
            return medplum_url
        return f"{self.url}project/{study_code}/{resource_path}"

    def _study_code_from_polling_url(self, polling_url: str) -> str | None:
        """Extract the studyCode embedded in a project-route polling URL."""
        path = urlparse(polling_url).path   # /fhir-gateway/project/{studyCode}/bulkdata/...
        segments = path.split("/")
        for i, seg in enumerate(segments):
            if seg == "project" and i + 1 < len(segments):
                return segments[i + 1]
        return None

    def _auth_headers(self, accept: str = "application/fhir+json") -> dict:
        token = self.auth.getClientCredentialToken()
        return {"Authorization": f"Bearer {token}", "Accept": accept}

    def trigger_bulk_export(self, study_code: str) -> str:
        """
        Kick off a FHIR bulk $export scoped to a single dataset project via
        fhirGateway's project route:
            GET {fhirGateway}/project/{study_code}/$export

        Returns a project-route polling URL so that subsequent poll requests
        use the same project credentials as the trigger (medplum scopes bulk
        export jobs to the client that created them).
        """
        url = f"{self.url}project/{study_code}/$export"
        response = requests.get(
            url,
            headers={**self._auth_headers(), "Prefer": "respond-async"},
            params={"_outputFormat": "application/fhir+ndjson"},
            verify=self.get_verify_value(),
        )
        self.logger.info(
            f"Triggered bulk export for study '{study_code}' via fhirGateway. "
            f"Response: [{response.status_code}]"
        )
        if response.status_code == 202:
            content_location = response.headers.get("Content-Location", "")
            if not content_location:
                raise Exception(
                    "Bulk export accepted (202) but no Content-Location header returned"
                )
            self.logger.info(
                f"Medplum Content-Location: {content_location}"
            )
            # Convert medplum's Content-Location to a project-route URL.
            # This ensures polling uses the project client credentials (same as trigger),
            # not admin credentials, so medplum can find the job.
            polling_url = self._to_project_url(content_location, study_code)
            self.logger.info(
                f"Polling via fhirGateway project route: {polling_url}"
            )
            return polling_url
        else:
            raise Exception(
                f"Failed to trigger bulk export for study '{study_code}' via fhirGateway: "
                f"[{response.status_code}] {response.content}"
            )

    def poll_export_status(
        self,
        polling_url: str,
        poll_interval: int = 10,
        max_wait: int = 3600,
    ) -> dict:
        """
        Poll the export job (via the fhirGateway project route URL) until it
        completes (HTTP 200). Output URLs in the returned manifest are
        rewritten to project-route URLs so Binary downloads also use project
        credentials.
        Raises TimeoutError after max_wait seconds.
        """
        study_code = self._study_code_from_polling_url(polling_url)
        elapsed = 0
        while elapsed < max_wait:
            response = requests.get(
                polling_url,
                headers=self._auth_headers("application/json"),
                verify=self.get_verify_value(),
            )

            if response.status_code == 200:
                manifest = response.json()
                # Rewrite every output URL to a project-route URL so Binary
                # downloads use the same project credentials.
                for entry in manifest.get("output", []):
                    if study_code:
                        entry["url"] = self._to_project_url(
                            entry.get("url", ""), study_code
                        )
                    else:
                        self.logger.warning(
                            f"Could not extract study_code from polling URL '{polling_url}'; "
                            f"output URL will not be rewritten: {entry.get('url')}"
                        )
                output_count = len(manifest.get("output", []))
                self.logger.info(
                    f"Bulk export complete – {output_count} output file(s)."
                )
                return manifest

            elif response.status_code == 202:
                progress = response.headers.get("X-Progress", "in progress")
                self.logger.info(
                    f"Export {progress}. "
                    f"Retrying in {poll_interval}s (elapsed: {elapsed}s)..."
                )
                time.sleep(poll_interval)
                elapsed += poll_interval

            else:
                raise Exception(
                    f"Export polling failed via fhirGateway: "
                    f"[{response.status_code}] {response.content}"
                )

        raise TimeoutError(
            f"Bulk export did not complete within {max_wait} seconds"
        )

    def download_ndjson_file(self, url: str, output_path: str) -> None:
        """
        Stream-download a single ndjson export file through fhirGateway and
        save it to output_path.  The url is expected to already be a
        fhirGateway superadmin URL.
        """
        response = requests.get(
            url,
            headers=self._auth_headers("application/fhir+ndjson"),
            verify=self.get_verify_value(),
            stream=True,
        )

        if response.status_code != 200:
            raise Exception(
                f"Failed to download ndjson via fhirGateway from '{url}': "
                f"[{response.status_code}] {response.content}"
            )

        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        self.logger.info(f"Downloaded ndjson to '{output_path}'")

    def stream_binary_to_trex(
        self,
        source_url: str,
        trex_url: str,
        trex_headers: dict | None = None,
        chunk_size: int = 8192,
    ) -> requests.Response:
        """
        Stream a Binary (or other large) resource from fhirGateway `source_url`
        directly into `trex_url` without writing to disk. The method performs
        a streaming GET from the fhirGateway URL and streams the bytes
        to `trex_url` using a streaming POST (generator as request body).

        Parameters:
        - source_url: a fhirGateway project/superadmin URL pointing at a Binary
          resource (already rewritten to use the project route where required).
        - trex_url: the target URL on trex that accepts the binary payload.
        - trex_headers: optional headers for the trex POST (e.g. auth). If not
          provided, the method will forward the Content-Type from the source
          response (or use application/octet-stream).
        - chunk_size: upload/download chunk size.

        Returns the `requests.Response` object from the trex POST on success.
        Raises Exception for non-200 GET or 4xx/5xx trex responses.
        """
        # GET the Binary from fhirGateway (streaming)
        get_resp = requests.get(
            source_url,
            headers=self._auth_headers("*/*"),
            verify=self.get_verify_value(),
            stream=True,
        )

        if get_resp.status_code != 200:
            raise Exception(
                f"Failed to download Binary via fhirGateway from '{source_url}': "
                f"[{get_resp.status_code}] {get_resp.content}"
            )

        content_type = get_resp.headers.get("Content-Type", "application/octet-stream")
        upload_headers = (trex_headers.copy() if trex_headers else {})
        upload_headers.setdefault("Content-Type", content_type)

        # Generator yields chunks from the GET response. This avoids buffering
        # the entire file in memory or writing it to disk.
        def _chunk_generator():
            for chunk in get_resp.iter_content(chunk_size=chunk_size):
                if chunk:
                    yield chunk

        # POST the generator to trex. requests will stream the request body.
        trex_resp = requests.post(
            trex_url,
            data=_chunk_generator(),
            headers=upload_headers,
            verify=self.get_verify_value(),
            timeout=None,
        )

        if trex_resp.status_code >= 400:
            raise Exception(
                f"Failed to upload Binary to trex '{trex_url}': "
                f"[{trex_resp.status_code}] {trex_resp.content}"
            )

        self.logger.info(
            f"Streamed Binary from '{source_url}' to trex '{trex_url}' [{trex_resp.status_code}]"
        )
        return trex_resp
