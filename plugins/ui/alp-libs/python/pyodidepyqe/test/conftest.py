import sys
import types

pyodide = types.ModuleType("pyodide")
pyodide_http = types.ModuleType("pyodide.http")

class FetchResponse:
    def __init__(self, body=None, status=200):
        self.body = body
        self.status = status

    async def json(self):
        return self.body

async def pyfetch(*args, **kwargs):
    raise NotImplementedError("pyodide.http.pyfetch is not available in tests")

pyodide_http.FetchResponse = FetchResponse
pyodide_http.pyfetch = pyfetch
pyodide.http = pyodide_http

sys.modules["pyodide"] = pyodide
sys.modules["pyodide.http"] = pyodide_http
