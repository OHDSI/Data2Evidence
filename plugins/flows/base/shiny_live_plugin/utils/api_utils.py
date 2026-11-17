"""Requests to the /parquet-export API shared by the dashboards."""
import json
from typing import Any, Dict, List, Optional

from pyodide.http import pyfetch

from d2e_bridge import sanitize_input

API_URL = "/parquet-export"


class ApiError(RuntimeError):
    """An HTTP error from the API, keeping the status and response text."""

    def __init__(self, status: int, text: str):
        super().__init__(f"API Error {status}: {text}")
        self.status = status
        self.text = text


def api_headers(token: str, dataset_id: str) -> Dict[str, str]:
    """Request headers for the API."""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "datasetId": dataset_id
    }


async def post_parquet_export(headers: Dict[str, str], body: Dict[str, Any]) -> Any:
    """POST a query body and return the parsed JSON, raising ApiError on an HTTP error."""
    response = await pyfetch(
        API_URL,
        method="POST",
        headers=headers,
        body=json.dumps(body),
    )
    response_data = await response.string()
    if response.status >= 400:
        raise ApiError(response.status, response_data)
    return json.loads(response_data)


async def fetch_cohort_count(headers: Dict[str, str], cohort_query_body: Dict[str, Any]) -> int:
    """Number of patients in the cohort, from the cohort-count query."""
    return (await post_parquet_export(headers, cohort_query_body))[0]["PCOUNT"]


def build_concept_filters(conditions: List[Dict[str, Any]], dialect: Optional[str]) -> List[Dict[str, Any]]:
    """Five condition filters for the query; HANA matches on concept_code, other dialects on concept_id."""
    dialect = str(dialect or "").lower()
    is_hana = dialect == "hana" or not dialect
    key = "CONCEPT_CODE" if is_hana else "CONCEPT_ID"

    concept_codes = []
    for idx in range(5):
        filter_item = {}
        if idx < len(conditions):
            raw = sanitize_input(str(conditions[idx].get("value", "")))
            if is_hana:
                filter_item[f"{key}{idx+1}"] = raw
            else:
                try:
                    filter_item[f"{key}{idx+1}"] = int(raw)
                except (ValueError, TypeError):
                    filter_item[f"{key}{idx+1}"] = 0
            filter_item[f"WILDCARD_FLAG{idx+1}"] = 1 if conditions[idx].get("useDescendants", False) else 0
        else:
            filter_item[f"{key}{idx+1}"] = "abc123" if is_hana else 0
            filter_item[f"WILDCARD_FLAG{idx+1}"] = 0
        concept_codes.append(filter_item)
    return concept_codes
