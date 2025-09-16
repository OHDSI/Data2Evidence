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
    deployment_id = "1d9848d7-6610-4be6-b8ac-25f918f6f51b"   # Replace with deployment ID
    parameters = {
  "options": {
    "user_name": "zhimin_t0905",
    "cohorts_id": "41",
    "dataset_id": "fb5dbcd6-8600-471a-903e-6fd5d7b8d48a",
    "materialize": False
  }
}
    bearer_token = "Bearer eyJhbGciOiJFUzM4NCIsInR5cCI6ImF0K2p3dCIsImtpZCI6Im45bTFudGZFTFNLeG9NYWtoVDh5TTZyLTVrTXdCbnJLeS0zc2VNQUthZGcifQ.eyJqdGkiOiJhMEFlM3g4RTc2WThUMDBEX19NeXIiLCJzdWIiOiJueGIwcGZlbjY5ZnIiLCJpYXQiOjE3NTc5MzExOTYsImV4cCI6MTc1NzkzNDc5Niwic2NvcGUiOiIiLCJjbGllbnRfaWQiOiJEdDdmMjhTdUpvcm5RN1Njc0JscEUiLCJpc3MiOiJodHRwczovL2xvY2FsaG9zdDo0MTEwMC9vaWRjIiwiYXVkIjoiaHR0cHM6Ly9hbHAtZGVmYXVsdCJ9.JodrP5FPatTtD1bVdfxVjPeZ83pd3RtT2lcDPRarVQt9UIMcYiF7_f6Te525YfCSNCJbvlUvNEZ83ZjBpRsvE2ahvYW8b4ecAo7X7L7xv1wWoV6iQV-Dtgd3WMLWqHea"  # Replace with Bearer token
    plugin_test = PluginsAuthTokenTest(deployment_id=deployment_id, parameters=parameters, bearer_token=bearer_token)
    plugin_test.create_flow_input()
    print("Flow input created successfully.")
    