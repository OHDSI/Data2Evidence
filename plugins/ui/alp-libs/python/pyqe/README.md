# PyQE

This library is the python interface to D4L Query Engine

Documentation for researchers can be viewed at `documentations/pyQE.md`.

Documentation for getting started can be viewed at `Getting_started_guide.md`.

# Usage:

- Install pyenv for management of python installations https://github.com/pyenv/pyenv#installation
- Install and set the global python to Python v3.9.15
  ```bash
  pyenv install 3.9.15
  # set the global python version to use
  pyenv global 3.9.15
  ```
- Change directory to pyqe before executing below commands
  ```
  cd alp-libs/python/pyqe
  ```
- Create virtual env if not yet created, and activate it
  ```
  python -m venv pyqeenv
  source pyqeenv/bin/activate
  ```
- Install dependencies
  ```
  pip install -r requirements-dev.txt
  ```
- Create .env file (refer to .env.example) for setting the environment variables (refer to table of `PYQE_URL`s below if needed)
  ```
  # PYQE WEB API INSTANCE CONNECTION
  PYQE_URL="http://localhost:41100"
  ```
- Run tests
  ```bash
  cd alp-libs/python/pyqe
  pytest
  ```
- view additional info below for setting up vscode

# Connecting to the backend

- update `PYQE_URL` to the url of choice

| PYQE_URL                                    | environment     |
| ------------------------------------------- | --------------- |
| https://localhost:41100       | local (gateway) |
| https://alp-dev.alp-dev.org        | dev             |
| https://alp-dev-eu.alp-dev.org     | dev eu          |
| https://alp-staging.alp-dev.org    | staging         |
| https://alp-staging-eu.alp-dev.org | staging eu      |

- if using `FRA Public Url`, ensure that the value of the `PYQE_TLS_CLIENT_CA_CERT_PATH` is set to `PYQE_TLS_CLIENT_CA_CERT_PATH=""`

# End to end tests for local development

## Running jupyter notebooks on VSCode using virtualenv

- Notebooks in `alp-data-node/libs/pyqe/samples/jupyter` can be run
- Install "Python Extension Pack" from VSCode Extensions
- Open a notebook, e.g. alp-data-node/libs/pyqe/samples/jupyter/demo.ipynb
- On the top right, click on "Select Kernel"
- type in the full path `/<FULL PATH TO FOLDER>/alp-clinical-research/alp-data-node/libs/pyqe/pyqeenv/bin/python`
- On running a Jupyter notebook cell for the first time, "Running cells with 'Python 3.9.15 ('pyqeenv': venv)' requires ipykernel package." message will appear. Check that the accurate python version was indicated, and click install.
- For notebooks located in `alp-clinical-research/alp-data-node/alp-jupyterhub/jupyternb-single-user/docs/demo-notebook`,
  - copy `alp-data-node/libs/pyqe/.env` to `alp-data-node/alp-jupyterhub/jupyternb-single-user/docs/demo-notebook/.env`
  - notebooks will automatically get env vars from this file when opened with vscode
  - temporarily add a new cell right at the top with

```python
import sys, os
sys.path.append(os.path.join(sys.path[0],'..', '..','..','..','libs','pyqe'))
```

- and set the query to use (replace or make new cell just after `Query` is created

```python
<QUERY_VARIABLE>.set_study('703c5d8a-a1d9-4d42-a314-5b9aad513390')
```

### Tips for using the right python interpreter

- If you decided to delete and create virtualenv, the python path is the same and vscode thinks it is the previously linked version
- In this case, Shift+Cmd+p and search for "Python: Clear cache and Reload Window". Doing this will refresh the "Python: Select Intepreter" options
- If the kernal versions do not update in VSCode's Jupyter notebook, proceed to quit and reopen VSCode, then select the python from the virtualenv
- When testing on local, make sure you have updated CDM and PA configs to the ones in the repository, and the default assignment uses them.

## Python scripts in virtualenv

```bash
cd alp-data-node/libs/pyqe
source pyqeenv/bin/activate
cd samples/python
python phekb_cataracts.py
```
