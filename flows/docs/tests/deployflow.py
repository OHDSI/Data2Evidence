import httpx
from dotenv import load_dotenv
import os
import json


class CreateDeploymentTest:
    def __init__(self, **kwargs):
        self.prefect_api_url = kwargs.get("prefect_api_url")
        self.flow_name = kwargs.get("flow_name")
        self.deployment_name = self.flow_name
        self.image_name = kwargs.get("image_name")
        self.entrypoint = kwargs.get("entrypoint")
        self.volumes = json.loads(kwargs.get("volumes", "[]"))
        self.networks = json.loads(kwargs.get("networks", "[]"))
        self.parameter_openapi_schema = kwargs.get("parameter_openapi_schema")
        self.tags = json.loads(kwargs.get("tags", "[]"))

    def create_flow(self):
        url = f"{self.prefect_api_url}/flows/"
        headers = {"Content-Type": "application/json"}

        payload = {"name": self.flow_name}
        response = httpx.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()

    def create_deployment(self):
        res = self.create_flow()
        flow_id = res.get("id")
        print(f"Flow ID: {flow_id}")
        headers = {"Content-Type": "application/json"}
        url = f"{self.prefect_api_url}/deployments/"

        payload = {
            "name": self.deployment_name,
            "flow_id": flow_id,
            "work_pool_name": "docker-pool",
            "work_queue_name": "default",
            "entrypoint": self.entrypoint,
            "enforce_parameter_schema": False,
            "parameter_openapi_schema": json.loads(self.parameter_openapi_schema),
            "job_variables": {
                "image": self.image_name,
                "image_pull_policy": "IfNotPresent",
                "volumes": self.volumes,
                "networks": self.networks,
            },
            "tags": self.tags,
        }
        response = httpx.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


if __name__ == "__main__":
    load_dotenv()

    deployment_id = os.getenv("DEPLOYMENT_ID")
    deployment_test = CreateDeploymentTest(
        prefect_api_url=os.getenv("PREFECT_API_URL"),
        flow_name=os.getenv("FLOW_NAME"),
        image_name=os.getenv("IMAGE_NAME"),
        entrypoint=os.getenv("ENTRYPOINT"),
        volumes=os.getenv("VOLUMES"),
        networks=os.getenv("NETWORKS"),
        parameter_openapi_schema=os.getenv("PARAMETER_OPENAPI_SCHEMA"),
        tags=os.getenv("TAGS", "[]"),
    )
    deployment_test.create_deployment()
    print("Deployment created/updated successfully.")
