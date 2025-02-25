import os
import json
from pyodide.http import pyfetch, FetchResponse

class Strategus():
    def __init__(self):
        super().__init__()
        self.analysis_spec = {
            "sharedResources": [],
            "moduleSpecifications": [],
            "attr_class": "AnalysisSpecifications"
        }
        self.execution_settings = {
            "cdmSchema": '',
            "databaseName": ''
        }
    
    def reset_analysis_specifications(self, dummy):
        print('args:')
        print(dummy)
        spec = {
            "sharedResources": [],
            "moduleSpecifications": [],
            "attr_class": "AnalysisSpecifications"
        } 
        self['analysis_spec'] = spec
        return self
    
    def add_schema_name(self, cdm_schema):
        self.execution_settings['cdmSchema'] = cdm_schema
        return self

    def add_database_name(self, database_name):
        self.execution_settings['databaseName'] = database_name
        return self
        
    
    def add_shared_resources(self, shared_resources): 
        self.analysis_spec['sharedResources'] = shared_resources
        return self

    def add_module_specifications(self, module_specifications):
        self.analysis_spec['moduleSpecifications'] = module_specifications
        return self

    async def execute(self, a):
        """Request HTTP GET method"""

        name = 'execute_strategus'
        parameters = {
            "options": {
                "cdmSchema": self.execution_settings['cdmSchema'],
                "workSchema": "strategus",
                "databaseName": self.execution_settings['databaseName'],
                "vocabSchemaName": "cdmvocab"
            },
            "analysis_spec": {
                "attr_class": "AnalysisSpecifications",
                "sharedResources": self.analysis_spec['sharedResources'],
                "moduleSpecifications": self.analysis_spec['moduleSpecifications']
            }
        }
        infrastructureDocId = ''
        body = {
            "state": {
                "type": 'SCHEDULED',
            },
            "parameters": parameters
        }

        url = os.getenv('PREFECT_STRATEGUS_FLOW_URL')
        url = 'http://localhost:41120/api/deployments/892d1dca-51fe-4975-b034-35a19e1702f1/create_flow_run'
        headers = {
            "Content-Type": "application/json"
        }
        response = await pyfetch(url=url, method="POST", body=json.dumps(body), headers = headers)
        return response
    
    async def get_strategus_flow():
        response = await pyfetch('http://localhost:41120/api/flows/name/execute_strategus', method = 'GET')
        print(response)
        return response