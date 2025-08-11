import json, requests

class PluginsAuthTokenTest():
    def __init__(self, deployment_id: str, parameters: str, bearer_token: str):
        self.deployment_id = deployment_id
        self.parameters = parameters
        self.bearer_token = bearer_token  

    def create_flow_run(self):
        url = f"http://localhost:41120/api/deployments/{self.deployment_id}/create_flow_run"
        headers = {
            "Content-Type": "application/json"
        }
            
        payload = {
            "parameters": self.parameters,
            "state": {
                "type": "SCHEDULED",
                "message": "Run from the Prefect UI",
                "state_details": {}
            },
            "enforce_parameter_schema": False
        }
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            verify=False
        )
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"Failed to create flow run: {response.status_code} - {response.text}")
            raise Exception(f"Failed to create flow run: {response.status_code} - {response.text}") 
        
    def create_flow_input(self):
        res = self.create_flow_run()
        flow_run_id = res.get("state").get("state_details").get("flow_run_id")
        print(f"Flow run ID: {flow_run_id}")
        headers = {
            "Content-Type": "application/json",
            "id": flow_run_id
        }
        url = f"http://localhost:41120/api/flow_runs/{flow_run_id}/input"
        value = {
            "token": self.bearer_token,
            "thirdpartytoken": "",
            "thirdpartyrefreshtoken": ""
        }
        
        payload = {
            "key": "authtoken",
            "value": json.dumps(value)} # Convert to JSON string
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            verify=False
        )
        if response.status_code in [200, 201]:
            return response.json()
        else:
            print(f"Failed to create flow input: {response.status_code} - {response.text}")
            raise Exception(f"Failed to create flow input: {response.status_code} - {response.text}") 
    

if __name__ == "__main__":
    deployment_id = "yyy"   # Replace with deployment ID
    parameters = {
        "options": {
        }
    }
    bearer_token = "Bearer xxx-xxx-xxx-xxx-xxxx"  # Replace with bearer token
    plugin_test = PluginsAuthTokenTest(deployment_id=deployment_id, parameters=parameters, bearer_token=bearer_token)
    plugin_test.create_flow_input()
    print("Flow input created successfully.")
    