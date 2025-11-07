# Pyodide-PyQE

This library is the python interface to D4L Query Engine for a Pyodide kernel
# Usage:
- From `https://localhost:41100/portal/`
- Click on `Notebooks`, and create a new notebook
- Run `from pyqe import *`


# Notes:
- Pyodide-PyQE uses ``pyfetch(url, **kwargs)`` to send http requests and returns ``FetchResponse`` objects (view https://pyodide.org/en/stable/usage/api/python-api/http.html for more information)
- All functions that send http requests are asynchronous due to ``pyfetch``
- Environment variables such as ``TOKEN`` and ``PYQE_URL`` are instantiated during the set up of the notebook. (See ``Notebook.tsx`` in ``services/alp-approuter/alp-ui/apps/portal/src/plugins/starboard/components/`` in the ``setupPYQE`` variable)
- Authentication for http requests is done using the bearer token that is instantiated as the ``TOKEN`` environment variable

# Docs:
- pyodide API: https://pyodide.org/en/stable/usage/api-reference.html
